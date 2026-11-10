import { afterAll, beforeAll, describe, expect, it } from "@jest/globals"
import request from "supertest"
import { startTestServer, uniqueEmail, type TestServer } from "./helpers/test-server.js"

async function createAccount(server: TestServer, role: "USER" | "ADMIN"): Promise<string> {
  const credentials = { email: uniqueEmail(), name: `Translation ${role}`, password: "password123" }
  await request(server.url).post("/api/auth/register").send(credentials).expect(201)
  if (role === "ADMIN") {
    await server.db.run(`UPDATE "User" SET role = 'ADMIN' WHERE email = $1`, [credentials.email])
  }
  // Log in again so the token carries the (possibly new) role.
  const login = await request(server.url)
    .post("/api/auth/login")
    .send({ email: credentials.email, password: credentials.password })
    .expect(200)
  return (login.body as { accessToken: string }).accessToken
}

describe("Translation usage (e2e) without a DeepL key", () => {
  let server: TestServer
  let adminToken: string
  let userToken: string

  beforeAll(async () => {
    // The test environment blanks DEEPL_API_KEY: the API starts, and only translating is off.
    server = await startTestServer()
    adminToken = await createAccount(server, "ADMIN")
    userToken = await createAccount(server, "USER")
  })
  afterAll(async () => {
    await server.stop()
  })

  it("starts, and the rest of the API works", async () => {
    await request(server.url).get("/api/health").expect(200)
  })

  it("is for administrators only", async () => {
    await request(server.url).get("/api/translation/usage").expect(401)
    await request(server.url)
      .get("/api/translation/usage")
      .set("Authorization", `Bearer ${userToken}`)
      .expect(403)
  })

  it("says that translating is not configured", async () => {
    const response = await request(server.url)
      .get("/api/translation/usage")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200)

    expect(response.body).toEqual({
      configured: false,
      used: null,
      limit: null,
      percent: null,
      warning: false,
    })
  })
})

describe("Translation usage (e2e) with the fake translator", () => {
  let server: TestServer
  let adminToken: string

  beforeAll(async () => {
    server = await startTestServer({ TRANSLATION_PROVIDER: "fake" })
    adminToken = await createAccount(server, "ADMIN")
  })
  afterAll(async () => {
    await server.stop()
  })

  it("reads the usage from the translator", async () => {
    const response = await request(server.url)
      .get("/api/translation/usage")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200)

    expect(response.body).toEqual({
      configured: true,
      used: 0,
      limit: 500000,
      percent: 0,
      warning: false,
    })
  })
})

describe("Translation settings (e2e)", () => {
  it("refuse to start in production without a DeepL key, naming the setting", async () => {
    await expect(
      startTestServer({
        NODE_ENV: "production",
        R2_ACCOUNT_ID: "a",
        R2_ACCESS_KEY_ID: "b",
        R2_SECRET_ACCESS_KEY: "c",
        R2_BUCKET: "d",
        R2_PUBLIC_URL: "https://media.e2e.test",
        TURNSTILE_SECRET_KEY: "0x4AAAAAAA-secret",
      }),
    ).rejects.toThrow(/DEEPL_API_KEY/)
  })
})
