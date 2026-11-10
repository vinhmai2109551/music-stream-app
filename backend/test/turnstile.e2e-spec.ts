import { afterAll, beforeAll, describe, expect, it } from "@jest/globals"
import request from "supertest"
import { startTestServer, uniqueEmail, type TestServer } from "./helpers/test-server.js"

/** Starting the API takes a few seconds, and more on a busy machine. */
const START_TIMEOUT_MS = 60_000

/**
 * With a secret key configured, login must carry a Turnstile token. These cases are all refused
 * before the server would contact Cloudflare, so they need no network; the Siteverify exchange
 * itself is covered by the unit tests of TurnstileService.
 */
describe("Turnstile on login (e2e)", () => {
  let server: TestServer
  const http = () => request(server.url)
  const credentials = { email: uniqueEmail(), name: "Turnstile User", password: "password123" }

  beforeAll(async () => {
    server = await startTestServer({ TURNSTILE_SECRET_KEY: "e2e-secret-key" })
    await http().post("/api/auth/register").send(credentials).expect(201)
  }, START_TIMEOUT_MS)

  afterAll(async () => {
    await server.stop()
  })

  const login = (body: object) => http().post("/api/auth/login").send(body)
  const right = { email: credentials.email, password: credentials.password }

  it("refuses a login without a token, even with the right password", async () => {
    const response = await login(right).expect(400)

    expect(JSON.stringify(response.body)).toContain("Security check")
  })

  it("answers a missing token the same way for a wrong password (nothing is learned about the account)", async () => {
    const response = await login({ email: right.email, password: "wrong-password" }).expect(400)

    expect(JSON.stringify(response.body)).toContain("Security check")
  })

  it.each(["", "   "])("refuses a blank token (%p)", async (turnstileToken) => {
    await login({ ...right, turnstileToken }).expect(400)
  })

  it("refuses a token longer than Cloudflare's 2048 characters", async () => {
    await login({ ...right, turnstileToken: "x".repeat(2049) }).expect(400)
  })

  it("does not touch register, refresh or logout", async () => {
    await http()
      .post("/api/auth/register")
      .send({ email: uniqueEmail(), name: "No Token", password: "password123" })
      .expect(201)
    await http().post("/api/auth/refresh").send({ refreshToken: "not-a-real-token" }).expect(401)
    await http().post("/api/auth/logout").send({ refreshToken: "anything" }).expect(204)
  })
})

describe("Login without a Turnstile secret key (e2e)", () => {
  it(
    "works with no token, and a token that is sent is accepted and ignored",
    async () => {
      const server = await startTestServer() // test env leaves TURNSTILE_SECRET_KEY blank
      try {
        const body = { email: uniqueEmail(), name: "Dev User", password: "password123" }
        await request(server.url).post("/api/auth/register").send(body).expect(201)

        const credentials = { email: body.email, password: body.password }
        await request(server.url).post("/api/auth/login").send(credentials).expect(200)
        await request(server.url)
          .post("/api/auth/login")
          .send({ ...credentials, turnstileToken: "anything" })
          .expect(200)
      } finally {
        await server.stop()
      }
    },
    START_TIMEOUT_MS,
  )
})
