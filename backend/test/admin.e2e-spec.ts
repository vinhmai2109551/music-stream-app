import { afterAll, beforeAll, describe, expect, it } from "@jest/globals"
import request from "supertest"
import {
  startTestServer,
  TEST_NAME_PREFIX,
  uniqueEmail,
  type TestServer,
} from "./helpers/test-server.js"

const IMAGE_URL = "https://media.e2e.test/covers/e2e.jpg"
const PASSWORD = "password123"

interface Session {
  accessToken: string
  refreshToken: string
  user: { id: string; email: string; role: string }
}
interface AdminUser {
  id: string
  email: string
  role: string
  isBanned: boolean
  isPremium: boolean
  createdAt: string
}
interface UserPage {
  items: AdminUser[]
  total: number
  page: number
  limit: number
  totalPages: number
}
interface Stats {
  totals: Record<string, number>
  topTracks: { id: string; title: string; artist: string; coverUrl: string; plays: number }[]
  playsByDay: { day: string; count: number }[]
  newUsersByDay: { day: string; count: number }[]
}
type LyricsStatus = Record<string, { hasLyrics: boolean; hasTimings: boolean }>

describe("Admin (e2e)", () => {
  let server: TestServer
  let admin: Session
  const http = () => request(server.url)
  const bearer = (session: Session) => ({ Authorization: `Bearer ${session.accessToken}` })

  async function signUp(name: string): Promise<{ session: Session; email: string }> {
    const email = uniqueEmail()
    const response = await http()
      .post("/api/auth/register")
      .send({ email, name, password: PASSWORD })
      .expect(201)
    return { session: response.body as Session, email }
  }

  async function makeAdmin(): Promise<Session> {
    const { session, email } = await signUp("Admin E2E")
    await server.db.run(`UPDATE "User" SET role = 'ADMIN' WHERE email = $1`, [email])
    // The role is read from the database on every request, so the token made as USER already works.
    return session
  }

  async function createTrack(name: string): Promise<string> {
    const artist = await http()
      .post("/api/artists")
      .set(bearer(admin))
      .send({ name: `${TEST_NAME_PREFIX}${name} Artist`, imageUrl: IMAGE_URL })
      .expect(201)
    const track = await http()
      .post("/api/tracks")
      .set(bearer(admin))
      .send({
        title: `${TEST_NAME_PREFIX}${name}`,
        artistId: (artist.body as { id: string }).id,
        coverUrl: IMAGE_URL,
        youtubeVideoId: "AAAAAAAAAAA",
        durationSec: 200,
      })
      .expect(201)
    return (track.body as { id: string }).id
  }

  beforeAll(async () => {
    server = await startTestServer()
    admin = await makeAdmin()
  })
  afterAll(async () => {
    await server.stop()
  })

  describe("access", () => {
    it("rejects anonymous callers (401) and ordinary users (403) on every admin endpoint", async () => {
      const { session: user } = await signUp("Plain user")
      const paths = [
        "/api/admin/stats",
        "/api/admin/users",
        "/api/admin/tracks/lyrics-status?ids=x",
      ]

      for (const path of paths) {
        await http().get(path).expect(401)
        await http().get(path).set(bearer(user)).expect(403)
      }
      await http().patch(`/api/admin/users/${user.user.id}`).set(bearer(user)).send({}).expect(403)
      await http().delete(`/api/admin/users/${user.user.id}`).set(bearer(user)).expect(403)
    })
  })

  describe("GET /admin/stats", () => {
    it("returns the totals, the top tracks and 14 days of plays and new users", async () => {
      const trackId = await createTrack("Stats song")
      const { session: listener } = await signUp("Listener")
      await http().post(`/api/tracks/${trackId}/play`).set(bearer(listener)).expect(200)

      const { body } = await http().get("/api/admin/stats").set(bearer(admin)).expect(200)
      const stats = body as Stats

      for (const key of ["tracks", "artists", "albums", "users", "plays", "playsLast7Days"]) {
        expect(typeof stats.totals[key]).toBe("number")
      }
      expect(stats.totals.tracks).toBeGreaterThanOrEqual(1)
      expect(stats.totals.users).toBeGreaterThanOrEqual(2)
      expect(stats.totals.plays).toBeGreaterThanOrEqual(1)
      expect(stats.totals.playsLast7Days).toBeGreaterThanOrEqual(1)

      for (const series of [stats.playsByDay, stats.newUsersByDay]) {
        expect(series).toHaveLength(14)
        expect(series.map((entry) => entry.day)).toEqual([...series.map((e) => e.day)].sort())
      }
      // Both happened a moment ago, so they are counted on the last day (today).
      expect(stats.playsByDay[13].count).toBeGreaterThanOrEqual(1)
      expect(stats.newUsersByDay[13].count).toBeGreaterThanOrEqual(2)

      expect(stats.topTracks.length).toBeLessThanOrEqual(5)
      expect(stats.topTracks.find((track) => track.id === trackId)).toMatchObject({
        coverUrl: IMAGE_URL,
        plays: 1,
      })
    })
  })

  describe("GET /admin/users", () => {
    it("lists users newest first and never returns a password hash", async () => {
      const { session } = await signUp("Listed user")

      const { body } = await http().get("/api/admin/users?limit=5").set(bearer(admin)).expect(200)
      const page = body as UserPage

      expect(page.limit).toBe(5)
      expect(page.items.length).toBeLessThanOrEqual(5)
      expect(page.items[0].id).toBe(session.user.id)
      for (const item of page.items) {
        expect(Object.keys(item).sort()).toEqual(
          ["avatarUrl", "createdAt", "email", "id", "isBanned", "isPremium", "name", "role"].sort(),
        )
      }
      expect(JSON.stringify(body)).not.toMatch(/passwordHash|\$2[aby]\$/)
    })

    it("searches by email or name, and filters by role and by ban", async () => {
      const { session, email } = await signUp("Zebra Findable")
      const search = (query: string) =>
        http().get(`/api/admin/users?${query}`).set(bearer(admin)).expect(200)

      const byName = (await search("q=zebra%20findable")).body as UserPage
      expect(byName.items.map((item) => item.id)).toEqual([session.user.id])

      const byEmail = (await search(`q=${encodeURIComponent(email.toUpperCase())}`))
        .body as UserPage
      expect(byEmail.items.map((item) => item.id)).toEqual([session.user.id])

      const admins = (await search("role=ADMIN&limit=50")).body as UserPage
      expect(admins.items.length).toBeGreaterThanOrEqual(1)
      expect(admins.items.every((item) => item.role === "ADMIN")).toBe(true)

      const banned = (await search("banned=true&q=zebra")).body as UserPage
      expect(banned.total).toBe(0)
      const notBanned = (await search("banned=false&q=zebra")).body as UserPage
      expect(notBanned.total).toBe(1)
    })

    it("rejects a malformed filter with 400", async () => {
      await http().get("/api/admin/users?banned=maybe").set(bearer(admin)).expect(400)
      await http().get("/api/admin/users?role=OWNER").set(bearer(admin)).expect(400)
      await http().get("/api/admin/users?limit=0").set(bearer(admin)).expect(400)
    })
  })

  describe("banning", () => {
    it("locks the user out everywhere, and lets them back in when unbanned", async () => {
      const { session, email } = await signUp("Soon banned")
      const patch = (body: object) =>
        http().patch(`/api/admin/users/${session.user.id}`).set(bearer(admin)).send(body)
      await http().get("/api/auth/me").set(bearer(session)).expect(200)

      const banned = (await patch({ isBanned: true }).expect(200)).body as AdminUser
      expect(banned).toMatchObject({ id: session.user.id, isBanned: true })

      // The access token they hold is refused although it has not expired.
      await http().get("/api/auth/me").set(bearer(session)).expect(401)
      // Logging in with the right password is refused with 403 and a clear message.
      const login = await http().post("/api/auth/login").send({ email, password: PASSWORD })
      expect(login.status).toBe(403)
      expect((login.body as { message: string }).message).toMatch(/banned/i)
      // So is refreshing: every refresh token of theirs was revoked, yet the answer is 403, not 401.
      const refresh = await http()
        .post("/api/auth/refresh")
        .send({ refreshToken: session.refreshToken })
      expect(refresh.status).toBe(403)
      // A wrong password still looks like any other wrong password.
      await http().post("/api/auth/login").send({ email, password: "wrong-password" }).expect(401)

      const live = await server.db.rows<{ n: string }>(
        `SELECT count(*) AS n FROM "RefreshToken" WHERE "userId" = $1 AND "revokedAt" IS NULL`,
        [session.user.id],
      )
      expect(Number(live[0].n)).toBe(0)

      const unbanned = (await patch({ isBanned: false }).expect(200)).body as AdminUser
      expect(unbanned.isBanned).toBe(false)
      await http().post("/api/auth/login").send({ email, password: PASSWORD }).expect(200)
    })

    it("refuses the access token of a banned user on an endpoint that needs a login", async () => {
      const { session } = await signUp("Banned reader")
      await http()
        .patch(`/api/admin/users/${session.user.id}`)
        .set(bearer(admin))
        .send({ isBanned: true })
        .expect(200)

      await http().post(`/api/tracks/any/play`).set(bearer(session)).expect(401)
    })

    it("changes a role, which counts at once without a new login", async () => {
      const { session } = await signUp("Promoted")
      await http().get("/api/admin/stats").set(bearer(session)).expect(403)

      await http()
        .patch(`/api/admin/users/${session.user.id}`)
        .set(bearer(admin))
        .send({ role: "ADMIN" })
        .expect(200)
      await http().get("/api/admin/stats").set(bearer(session)).expect(200)

      await http()
        .patch(`/api/admin/users/${session.user.id}`)
        .set(bearer(admin))
        .send({ role: "USER" })
        .expect(200)
      await http().get("/api/admin/stats").set(bearer(session)).expect(403)
    })

    it("refuses to let an admin ban, demote or delete their own account", async () => {
      const self = admin.user.id

      await http()
        .patch(`/api/admin/users/${self}`)
        .set(bearer(admin))
        .send({ isBanned: true })
        .expect(400)
      await http()
        .patch(`/api/admin/users/${self}`)
        .set(bearer(admin))
        .send({ role: "USER" })
        .expect(400)
      await http().delete(`/api/admin/users/${self}`).set(bearer(admin)).expect(400)

      // Still an admin, still able to log in.
      await http().get("/api/admin/stats").set(bearer(admin)).expect(200)
    })

    it("rejects an empty or unknown change, and an unknown user", async () => {
      const { session } = await signUp("Target")

      await http()
        .patch(`/api/admin/users/${session.user.id}`)
        .set(bearer(admin))
        .send({})
        .expect(400)
      await http()
        .patch(`/api/admin/users/${session.user.id}`)
        .set(bearer(admin))
        .send({ role: "OWNER" })
        .expect(400)
      await http()
        .patch(`/api/admin/users/${session.user.id}`)
        .set(bearer(admin))
        .send({ passwordHash: "x" })
        .expect(400)
      await http()
        .patch("/api/admin/users/does-not-exist")
        .set(bearer(admin))
        .send({ isBanned: true })
        .expect(404)
    })
  })

  describe("DELETE /admin/users/:id", () => {
    it("deletes another user with their tokens, then answers 404", async () => {
      const { session } = await signUp("To delete")

      await http().delete(`/api/admin/users/${session.user.id}`).set(bearer(admin)).expect(204)

      await http().get("/api/auth/me").set(bearer(session)).expect(401)
      const rows = await server.db.rows(`SELECT 1 FROM "RefreshToken" WHERE "userId" = $1`, [
        session.user.id,
      ])
      expect(rows).toHaveLength(0)
      await http().delete(`/api/admin/users/${session.user.id}`).set(bearer(admin)).expect(404)
    })
  })

  describe("GET /admin/tracks/lyrics-status", () => {
    it("tells no lyrics, plain lyrics and synced lyrics apart for a page of tracks", async () => {
      const bare = await createTrack("Status bare")
      const plain = await createTrack("Status plain")
      const synced = await createTrack("Status synced")
      await http()
        .put(`/api/tracks/${plain}/lyrics`)
        .set(bearer(admin))
        .send({ language: "vi", lines: ["một", "hai"], source: "manual" })
        .expect(200)
      await http()
        .put(`/api/tracks/${synced}/lyrics`)
        .set(bearer(admin))
        .send({ language: "vi", lines: ["một", "hai"], timingsMs: [0, 1500], source: "manual" })
        .expect(200)

      const { body } = await http()
        .get(`/api/admin/tracks/lyrics-status?ids=${bare},${plain},${synced},unknown-id`)
        .set(bearer(admin))
        .expect(200)

      expect(body as LyricsStatus).toEqual({
        [bare]: { hasLyrics: false, hasTimings: false },
        [plain]: { hasLyrics: true, hasTimings: false },
        [synced]: { hasLyrics: true, hasTimings: true },
        "unknown-id": { hasLyrics: false, hasTimings: false },
      })
    })

    it("needs between 1 and 100 ids", async () => {
      await http().get("/api/admin/tracks/lyrics-status").set(bearer(admin)).expect(400)
      await http().get("/api/admin/tracks/lyrics-status?ids=").set(bearer(admin)).expect(400)
      const tooMany = Array.from({ length: 101 }, (_, i) => `id${i}`).join(",")
      await http()
        .get(`/api/admin/tracks/lyrics-status?ids=${tooMany}`)
        .set(bearer(admin))
        .expect(400)
    })
  })
})
