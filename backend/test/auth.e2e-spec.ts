import { afterAll, beforeAll, describe, expect, it } from "@jest/globals"
import { createHash } from "node:crypto"
import request from "supertest"
import { startTestServer, uniqueEmail, type TestServer } from "./helpers/test-server.js"

interface Session {
  accessToken: string
  refreshToken: string
  user: { id: string; email: string; role: string }
}

interface TokenRow {
  tokenHash: string
  familyId: string
  revokedAt: Date | null
}

const ACCESS_TOKEN_SECONDS = 15 * 60
const REFRESH_TOKEN_BYTES = 64
const REFRESH_TOKEN_DAYS = 30

describe("Auth tokens (e2e)", () => {
  let server: TestServer
  const http = () => request(server.url)

  beforeAll(async () => {
    server = await startTestServer()
  })

  afterAll(async () => {
    await server.stop()
  })

  async function register(): Promise<{ email: string; password: string; session: Session }> {
    const body = { email: uniqueEmail(), name: "E2E User", password: "password123" }
    const response = await http().post("/api/auth/register").send(body).expect(201)
    return { email: body.email, password: body.password, session: response.body as Session }
  }

  async function login(email: string, password: string): Promise<Session> {
    const response = await http().post("/api/auth/login").send({ email, password }).expect(200)
    return response.body as Session
  }

  const refresh = (refreshToken: string) => http().post("/api/auth/refresh").send({ refreshToken })
  const me = (accessToken: string) =>
    http().get("/api/auth/me").set("Authorization", `Bearer ${accessToken}`)
  const tokensOf = (userId: string) =>
    server.db.rows<TokenRow>(`SELECT * FROM "RefreshToken" WHERE "userId" = $1`, [userId])
  const decodePayload = (jwt: string) =>
    JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString()) as Record<string, unknown>

  describe("login and register", () => {
    it("login returns an access token, a refresh token and the user", async () => {
      const { email, password } = await register()
      const session = await login(email, password)

      expect(session.user.email).toBe(email)
      expect(typeof session.accessToken).toBe("string")
      expect(typeof session.refreshToken).toBe("string")
      await me(session.accessToken).expect(200)
    })

    it("access token lives 15 minutes and only carries { sub, role }", async () => {
      const { session } = await register()
      const payload = decodePayload(session.accessToken)

      expect(Object.keys(payload).sort()).toEqual(["exp", "iat", "role", "sub"])
      expect(payload.sub).toBe(session.user.id)
      expect(payload.role).toBe("USER")
      expect((payload.exp as number) - (payload.iat as number)).toBe(ACCESS_TOKEN_SECONDS)
    })

    it("refresh token is 64 random bytes (not a JWT); only its SHA-256 hash is stored", async () => {
      const { session } = await register()
      const raw = session.refreshToken

      expect(raw.split(".")).toHaveLength(1)
      expect(Buffer.from(raw, "base64url")).toHaveLength(REFRESH_TOKEN_BYTES)

      const [stored, ...others] = await tokensOf(session.user.id)
      expect(others).toHaveLength(0)
      expect(stored.tokenHash).toBe(createHash("sha256").update(raw).digest("hex"))
      expect(stored.tokenHash).not.toBe(raw)

      const [{ days }] = await server.db.rows<{ days: string }>(
        `SELECT EXTRACT(EPOCH FROM ("expiresAt" - (now() AT TIME ZONE 'utc'))) / 86400 AS days
           FROM "RefreshToken" WHERE "userId" = $1`,
        [session.user.id],
      )
      expect(Math.round(Number(days))).toBe(REFRESH_TOKEN_DAYS)
    })

    it("a wrong password is 401 and issues no token", async () => {
      const { email, session } = await register()
      const before = (await tokensOf(session.user.id)).length

      await http().post("/api/auth/login").send({ email, password: "wrong-password" }).expect(401)

      expect(await tokensOf(session.user.id)).toHaveLength(before)
    })
  })

  describe("refresh", () => {
    it("rotates: returns a new pair, revokes the old token and keeps the family", async () => {
      const { session } = await register()
      const response = await refresh(session.refreshToken).expect(200)
      const pair = response.body as { accessToken: string; refreshToken: string }

      expect(Object.keys(pair).sort()).toEqual(["accessToken", "refreshToken"])
      expect(pair.refreshToken).not.toBe(session.refreshToken)
      await me(pair.accessToken).expect(200)

      const rows = await tokensOf(session.user.id)
      expect(rows).toHaveLength(2)
      expect(new Set(rows.map((row) => row.familyId)).size).toBe(1)
      expect(rows.filter((row) => row.revokedAt === null)).toHaveLength(1)
    })

    it("the new token can be rotated again", async () => {
      const { session } = await register()
      const first = (await refresh(session.refreshToken).expect(200)).body as Session
      await refresh(first.refreshToken).expect(200)
    })

    it("reusing an old token is 401 and revokes the whole family", async () => {
      const { session } = await register()
      const rotated = (await refresh(session.refreshToken).expect(200)).body as Session

      await refresh(session.refreshToken).expect(401) // replay of the revoked token
      await refresh(rotated.refreshToken).expect(401) // its successor died with the family

      const rows = await tokensOf(session.user.id)
      expect(rows.every((row) => row.revokedAt !== null)).toBe(true)
    })

    it("reuse only kills its own login, not the user's other sessions", async () => {
      const { email, password, session } = await register()
      const otherDevice = await login(email, password)
      const rotated = (await refresh(session.refreshToken).expect(200)).body as Session

      await refresh(session.refreshToken).expect(401)
      await refresh(rotated.refreshToken).expect(401)
      await refresh(otherDevice.refreshToken).expect(200)
    })

    it("two simultaneous refreshes with the same token: one wins, then the family is revoked", async () => {
      const { session } = await register()
      const [a, b] = await Promise.all([
        refresh(session.refreshToken),
        refresh(session.refreshToken),
      ])

      expect([a.status, b.status].sort()).toEqual([200, 401])
      const winner = (a.status === 200 ? a : b).body as Session
      await refresh(winner.refreshToken).expect(401)
    })

    it("an expired token is 401", async () => {
      const { session } = await register()
      await server.db.run(
        `UPDATE "RefreshToken" SET "expiresAt" = (now() AT TIME ZONE 'utc') - interval '1 second'
          WHERE "userId" = $1`,
        [session.user.id],
      )

      await refresh(session.refreshToken).expect(401)
    })

    it("unknown tokens are 401 and a missing token is a 400 validation error", async () => {
      await refresh("not-a-real-token").expect(401)
      await http().post("/api/auth/refresh").send({}).expect(400)
    })
  })

  describe("logout", () => {
    it("returns 204 and the token can no longer be refreshed", async () => {
      const { session } = await register()

      await http().post("/api/auth/logout").send({ refreshToken: session.refreshToken }).expect(204)

      await refresh(session.refreshToken).expect(401)
    })

    it("is idempotent, also for unknown tokens", async () => {
      const { session } = await register()
      const body = { refreshToken: session.refreshToken }

      await http().post("/api/auth/logout").send(body).expect(204)
      await http().post("/api/auth/logout").send(body).expect(204)
      await http().post("/api/auth/logout").send({ refreshToken: "never-issued" }).expect(204)
    })

    it("only ends that login, not the user's other sessions", async () => {
      const { email, password, session } = await register()
      const otherDevice = await login(email, password)

      await http().post("/api/auth/logout").send({ refreshToken: session.refreshToken }).expect(204)

      await refresh(otherDevice.refreshToken).expect(200)
    })
  })
})
