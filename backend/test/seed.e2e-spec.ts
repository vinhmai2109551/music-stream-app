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
  audioUrl: string | null
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
    const audioOf = async (server: TestServer, id: string) =>
      ((await request(server.url).get(`/api/tracks/${id}`).expect(200)).body as TrackBody).audioUrl
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
      // Only the original demo tracks have a file on R2; commercial tracks play from YouTube.
      expect(await audioOf(server, "flower")).toBe("https://media.e2e.test/audio/flower.mp3")
      expect(await audioOf(server, "bts-dynamite")).toBeNull()

      const korea = await request(server.url).get("/api/artists?region=KOREA").expect(200)
      const total = await request(server.url).get("/api/artists?limit=1").expect(200)
      expect((korea.body as Page).total).toBeGreaterThan(0)
      expect((korea.body as Page).total).toBeLessThan((total.body as Page).total)

      // Break two rows by hand, as an old database or a manual edit would have them.
      const dynamite = await videoOf(server, "bts-dynamite")
      await server.db.run(`UPDATE "Artist" SET region = 'GLOBAL' WHERE id = 'bts'`)
      await server.db.run(`UPDATE "Track" SET "youtubeVideoId" = NULL WHERE id = 'bts-dynamite'`)
      await server.db.run(
        `UPDATE "Track" SET "audioUrl" = 'https://media.e2e.test/audio/bts-dynamite.mp3' WHERE id = 'bts-dynamite'`,
      )

      // Second start: the seed runs again and must put both values back (the update path).
      const again = await startTestServer(env)
      try {
        expect(await regionOf(again, "bts")).toBe("KOREA")
        expect(await videoOf(again, "bts-dynamite")).toBe(dynamite)
        // A file link left by the older seed is removed again.
        expect(await audioOf(again, "bts-dynamite")).toBeNull()
      } finally {
        await again.stop()
      }
    } finally {
      await wipeSeededData(server.db)
      await server.stop()
    }
  })

  it("gives artists, albums, playlists and songs the pictures of their official videos", async () => {
    const env = { ...SEED_ENV, R2_PUBLIC_URL: "https://media.e2e.test" }
    const picture = /^https:\/\/i\.ytimg\.com\/vi\/[\w-]{11}\/(hq720|mqdefault)\.jpg$/
    await withServer(env, async (server) => {
      const get = async <T>(path: string) =>
        (await request(server.url).get(path).expect(200)).body as T

      const artist = await get<{ image: string }>("/api/artists/bts")
      const album = await get<{ cover: string }>("/api/albums/bts-hits")
      const song = await get<{ cover: string; youtubeVideoId: string }>("/api/tracks/bts-dynamite")
      const playlist = await get<{ cover: string | null }>("/api/playlists/top-kpop")

      for (const url of [artist.image, album.cover, song.cover, playlist.cover ?? ""]) {
        expect(url).toMatch(picture)
      }
      expect(song.cover).toContain(song.youtubeVideoId)
      // The album shows another picture than the artist, so the two tiles are not twins.
      expect(album.cover).not.toBe(artist.image)

      // Artists without a video (the demo data, Kevin MacLeod) keep the files of the bucket.
      const demo = await get<{ image: string }>("/api/artists/ryan")
      const macleod = await get<{ image: string }>("/api/artists/kevin-macleod")
      expect(demo.image).toBe("https://media.e2e.test/artists/ryan-young.png")
      expect(macleod.image).toBe("https://media.e2e.test/artists/kevin-macleod.jpg")
    })
  })

  it("the Background playlist holds 8 Creative Commons tracks that play from R2, never from YouTube", async () => {
    const env = { ...SEED_ENV, R2_PUBLIC_URL: "https://media.e2e.test" }
    await withServer(env, async (server) => {
      const response = await request(server.url).get("/api/playlists/background-play").expect(200)
      const playlist = response.body as {
        name: string
        isOfficial: boolean
        tracks: {
          id: string
          artistId: string
          audioUrl: string | null
          youtubeVideoId: string | null
        }[]
      }

      expect(playlist.name).toBe("Phát nền – Background")
      expect(playlist.isOfficial).toBe(true)
      expect(playlist.tracks).toHaveLength(8)
      for (const track of playlist.tracks) {
        expect(track.artistId).toBe("kevin-macleod")
        expect(track.youtubeVideoId).toBeNull()
        expect(track.audioUrl).toBe(`https://media.e2e.test/audio/${track.id}.mp3`)
      }
      // Same slugs as LICENSED_AUDIO.md, in playlist order.
      expect(playlist.tracks.map((track) => track.id)).toEqual([
        "kevin-macleod-stratosphere",
        "kevin-macleod-ghost-dance",
        "kevin-macleod-strength-of-the-titans",
        "kevin-macleod-sugar-plum-dark-mix",
        "kevin-macleod-fork-and-spoon",
        "kevin-macleod-tea-roots",
        "kevin-macleod-dream-catcher",
        "kevin-macleod-severe-tire-damage",
      ])
    })
  })
})
