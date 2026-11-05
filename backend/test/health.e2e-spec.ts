import { afterAll, beforeAll, describe, expect, it } from "@jest/globals"
import request from "supertest"
import { startTestServer, type TestServer } from "./helpers/test-server.js"

describe("Health check (e2e)", () => {
  let server: TestServer

  beforeAll(async () => {
    server = await startTestServer()
  })

  afterAll(async () => {
    await server.stop()
  })

  it("GET /api/health is public and says the API and its database are up", async () => {
    const response = await request(server.url).get("/api/health").expect(200)

    expect(response.body).toEqual({ status: "ok", database: "up" })
    expect(response.headers["content-type"]).toContain("application/json")
    expect(response.headers["cache-control"]).toBe("no-store")
  })

  it("is not rate limited: a monitor may call it often", async () => {
    const statuses: number[] = []
    for (let i = 0; i < 30; i++)
      statuses.push((await request(server.url).get("/api/health")).status)

    expect(statuses.every((status) => status === 200)).toBe(true)
  })

  it("is listed in the API documentation", async () => {
    const docs = await request(server.url).get("/api/docs-json")

    expect(Object.keys((docs.body as { paths: Record<string, unknown> }).paths)).toContain(
      "/api/health",
    )
  })
})
