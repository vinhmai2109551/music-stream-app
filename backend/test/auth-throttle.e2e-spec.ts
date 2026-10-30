import { afterAll, beforeAll, describe, expect, it } from "@jest/globals"
import request from "supertest"
import { startTestServer, uniqueEmail, type TestServer } from "./helpers/test-server.js"

const LIMIT = 5

describe("Auth rate limiting (e2e)", () => {
  let server: TestServer
  const http = () => request(server.url)

  // A dedicated server means fresh counters, so this file never interferes with the other specs.
  beforeAll(async () => {
    server = await startTestServer({ AUTH_THROTTLE_LIMIT: String(LIMIT) })
  })

  afterAll(async () => {
    await server.stop()
  })

  /** Sends `count` requests one after another and returns their status codes. */
  async function statuses(count: number, send: () => request.Test): Promise<number[]> {
    const result: number[] = []
    for (let i = 0; i < count; i++) result.push((await send()).status)
    return result
  }

  it("login: the 6th attempt within a minute is 429", async () => {
    const attempt = () =>
      http().post("/api/auth/login").send({ email: uniqueEmail(), password: "wrong-password" })

    expect(await statuses(LIMIT + 1, attempt)).toEqual([401, 401, 401, 401, 401, 429])
  })

  it("refresh: the 6th attempt within a minute is 429", async () => {
    const attempt = () =>
      http().post("/api/auth/refresh").send({ refreshToken: "not-a-real-token" })

    expect(await statuses(LIMIT + 1, attempt)).toEqual([401, 401, 401, 401, 401, 429])
  })

  it("register: the 6th attempt within a minute is 429", async () => {
    const attempt = () =>
      http()
        .post("/api/auth/register")
        .send({ email: uniqueEmail(), name: "Throttled", password: "password123" })

    expect(await statuses(LIMIT + 1, attempt)).toEqual([201, 201, 201, 201, 201, 429])
  })

  it("logout is not rate limited", async () => {
    const attempt = () => http().post("/api/auth/logout").send({ refreshToken: "anything" })

    expect(await statuses(LIMIT * 2, attempt)).toEqual(Array(LIMIT * 2).fill(204))
  })
})
