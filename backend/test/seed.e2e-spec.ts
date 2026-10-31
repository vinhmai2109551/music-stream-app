import { describe, expect, it } from "@jest/globals"
import request from "supertest"
import { startTestServer, TEST_EMAIL_DOMAIN, type TestServer } from "./helpers/test-server.js"
import type { TestDb } from "./helpers/test-database.js"

const SEED_ENV = {
  SEED_ON_START: "true",
  SEED_ADMIN_EMAIL: `seed-admin@${TEST_EMAIL_DOMAIN}`,
  SEED_ADMIN_PASSWORD: "password123",
}

interface Page {
  total: number
}

interface ArtistBody {
  region: string
}

interface TrackBody {
  youtubeVideoId: string | null
}

/** The seed fills the whole catalog; the other specs expect an empty one, so remove it again. */
async function wipeSeededData(db: TestDb): Promise<void> {
  await db.run(`DELETE FROM "Artist"`) // tracks, albums, feed posts and their comments go with it
  await db.run(`DELETE FROM "Playlist" WHERE "isOfficial" = true`)
  await db.run(`DELETE FROM "User" WHERE email LIKE '%@seed.invalid'`)
}

async function withServer(env: Record<string, string>, run: (server: TestServer) => Promise<void>) {
  const server = await startTestServer(env)
  try {
    await run(server)
  } finally {
    await wipeSeededData(server.db)
    await server.stop()
  }
}

describe("Seed on start (e2e)", () => {
  it("skips the seed and still starts when R2_PUBLIC_URL is empty", async () => {
    await withServer({ ...SEED_ENV, R2_PUBLIC_URL: "" }, async (server) => {
      const artists = await request(server.url).get("/api/artists").expect(200)

      expect((artists.body as Page).total).toBe(0)
    })
  })

  it("writes region and youtubeVideoId, on create and again on update", async () => {
    const env = { ...SEED_ENV, R2_PUBLIC_URL: "https://media.e2e.test" }
    const regionOf = async (server: TestServer, id: string) =>
      ((await request(server.url).get(`/api/artists/${id}`).expect(200)).body as ArtistBody).region
    const videoOf = async (server: TestServer, id: string) =>
      ((await request(server.url).get(`/api/tracks/${id}`).expect(200)).body as TrackBody)
        .youtubeVideoId

    // First start: the rows are created.
    const server = await startTestServer(env)
    try {
      expect(await regionOf(server, "bts")).toBe("KOREA")
      expect(await regionOf(server, "son-tung")).toBe("VIETNAM")
      expect(await regionOf(server, "ryan")).toBe("GLOBAL")
      expect(await videoOf(server, "bts-dynamite")).toMatch(/^[A-Za-z0-9_-]{11}$/)
      expect(await videoOf(server, "flower")).toBeNull()

      const korea = await request(server.url).get("/api/artists?region=KOREA").expect(200)
      const total = await request(server.url).get("/api/artists?limit=1").expect(200)
      expect((korea.body as Page).total).toBeGreaterThan(0)
      expect((korea.body as Page).total).toBeLessThan((total.body as Page).total)

      // Break two rows by hand, as an old database or a manual edit would have them.
      const dynamite = await videoOf(server, "bts-dynamite")
      await server.db.run(`UPDATE "Artist" SET region = 'GLOBAL' WHERE id = 'bts'`)
      await server.db.run(`UPDATE "Track" SET "youtubeVideoId" = NULL WHERE id = 'bts-dynamite'`)

      // Second start: the seed runs again and must put both values back (the update path).
      const again = await startTestServer(env)
      try {
        expect(await regionOf(again, "bts")).toBe("KOREA")
        expect(await videoOf(again, "bts-dynamite")).toBe(dynamite)
      } finally {
        await again.stop()
      }
    } finally {
      await wipeSeededData(server.db)
      await server.stop()
    }
  })
})
