import { afterAll, beforeAll, describe, expect, it } from "@jest/globals"
import request from "supertest"
import { startTestServer, uniqueEmail, type TestServer } from "./helpers/test-server.js"

const CREDENTIALS_LIMIT = 5
const REFRESH_LIMIT = 8

/** Sends `count` requests one after another and returns their status codes. */
async function statuses(count: number, send: (index: number) => request.Test): Promise<number[]> {
  const result: number[] = []
  for (let i = 0; i < count; i++) result.push((await send(i)).status)
  return result
}

describe("Auth rate limiting (e2e)", () => {
  let server: TestServer
  const http = () => request(server.url)

  // A dedicated server means fresh counters, so this file never interferes with the other specs.
  beforeAll(async () => {
    server = await startTestServer({
      AUTH_THROTTLE_LIMIT: String(CREDENTIALS_LIMIT),
      REFRESH_THROTTLE_LIMIT: String(REFRESH_LIMIT),
    })
  })

  afterAll(async () => {
    await server.stop()
  })

  describe("login and register: the strict group", () => {
    it("login: the 6th attempt within a minute is 429", async () => {
      const attempt = () =>
        http().post("/api/auth/login").send({ email: uniqueEmail(), password: "wrong-password" })

      expect(await statuses(CREDENTIALS_LIMIT + 1, attempt)).toEqual([401, 401, 401, 401, 401, 429])
    })

    it("register: the 6th attempt within a minute is 429", async () => {
      const attempt = () =>
        http()
          .post("/api/auth/register")
          .send({ email: uniqueEmail(), name: "Throttled", password: "password123" })

      expect(await statuses(CREDENTIALS_LIMIT + 1, attempt)).toEqual([201, 201, 201, 201, 201, 429])
    })
  })

  describe("refresh: the wider group", () => {
    const attempt = () =>
      http().post("/api/auth/refresh").send({ refreshToken: "not-a-real-token" })

    it("is not held back by the strict limit: it allows more than 5 calls", async () => {
      const result = await statuses(REFRESH_LIMIT, attempt)

      expect(result).toEqual(Array(REFRESH_LIMIT).fill(401))
    })

    it("answers 429 once its own limit is used up", async () => {
      // REFRESH_LIMIT calls were made by the previous test.
      expect(await statuses(2, attempt)).toEqual([429, 429])
    })

    it("a used-up login limit does not block refresh, and the other way round", async () => {
      const other = await startTestServer({
        AUTH_THROTTLE_LIMIT: String(CREDENTIALS_LIMIT),
        REFRESH_THROTTLE_LIMIT: String(REFRESH_LIMIT),
      })
      try {
        const login = () =>
          request(other.url)
            .post("/api/auth/login")
            .send({ email: uniqueEmail(), password: "wrong-password" })
        const refresh = () =>
          request(other.url).post("/api/auth/refresh").send({ refreshToken: "not-a-real-token" })

        expect(await statuses(CREDENTIALS_LIMIT + 1, login)).toContain(429)
        expect(await statuses(REFRESH_LIMIT, refresh)).toEqual(Array(REFRESH_LIMIT).fill(401))
        expect((await login()).status).toBe(429)
      } finally {
        await other.stop()
      }
    })
  })

  it("logout is not rate limited", async () => {
    const attempt = () => http().post("/api/auth/logout").send({ refreshToken: "anything" })

    expect(await statuses(CREDENTIALS_LIMIT * 2, attempt)).toEqual(
      Array(CREDENTIALS_LIMIT * 2).fill(204),
    )
  })
})

describe("Rate limiting behind a proxy (TRUST_PROXY, e2e)", () => {
  const login = (server: TestServer, forwardedFor: string) =>
    request(server.url)
      .post("/api/auth/login")
      .set("X-Forwarded-For", forwardedFor)
      .send({ email: uniqueEmail(), password: "wrong-password" })

  it("TRUST_PROXY=1 (default): each visitor behind the proxy has their own counter", async () => {
    const server = await startTestServer({ AUTH_THROTTLE_LIMIT: String(CREDENTIALS_LIMIT) })
    try {
      const noisy = await statuses(CREDENTIALS_LIMIT + 1, () => login(server, "203.0.113.10"))
      const quiet = await login(server, "203.0.113.11")

      expect(noisy).toEqual([401, 401, 401, 401, 401, 429])
      expect(quiet.status).toBe(401)
    } finally {
      await server.stop()
    }
  })

  it("TRUST_PROXY=false: the header is ignored, so every caller shares the socket's address", async () => {
    const server = await startTestServer({
      AUTH_THROTTLE_LIMIT: String(CREDENTIALS_LIMIT),
      TRUST_PROXY: "false",
    })
    try {
      // A different "visitor" in every request does not help: they all come from this machine.
      const result = await statuses(CREDENTIALS_LIMIT + 1, (i) => login(server, `203.0.113.${i}`))

      expect(result).toEqual([401, 401, 401, 401, 401, 429])
    } finally {
      await server.stop()
    }
  })
})
