import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { afterAll, beforeAll, describe, expect, it } from "@jest/globals"
import request from "supertest"
import {
  artistEmbeddingText,
  contentHash,
  trackEmbeddingText,
} from "../src/modules/embeddings/embedding-text.js"
import {
  startTestServer,
  TEST_NAME_PREFIX,
  uniqueEmail,
  type TestServer,
} from "./helpers/test-server.js"

const run = promisify(execFile)
const MODEL = "hashing-v1"
const MEDIA = "https://media.example.com"
const WAIT_MS = 15_000

interface Stored {
  model: string
  contentHash: string
  dims: number
  updatedAt: Date
}

/** Waits until `read` gives something other than undefined (the sync runs in the background). */
async function eventually<T>(read: () => Promise<T | undefined>, timeoutMs = WAIT_MS): Promise<T> {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    const value = await read()
    if (value !== undefined) return value
    if (Date.now() > deadline) throw new Error("Timed out waiting for the embedding")
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
}

async function adminToken(server: TestServer): Promise<string> {
  const credentials = { email: uniqueEmail(), name: "Embedding admin", password: "password123" }
  await request(server.url).post("/api/auth/register").send(credentials).expect(201)
  await server.db.run(`UPDATE "User" SET role = 'ADMIN' WHERE email = $1`, [credentials.email])
  const login = await request(server.url)
    .post("/api/auth/login")
    .send({ email: credentials.email, password: credentials.password })
    .expect(200)
  return (login.body as { accessToken: string }).accessToken
}

describe("Embeddings kept up to date (e2e)", () => {
  let server: TestServer
  let token: string
  const http = () => request(server.url)
  const admin = () => ({ Authorization: `Bearer ${token}` })

  const trackRow = async (id: string): Promise<Stored | undefined> =>
    (
      await server.db.rows<Stored>(
        `SELECT model, "contentHash", vector_dims(embedding) AS dims, "updatedAt" FROM "TrackEmbedding" WHERE "trackId" = $1`,
        [id],
      )
    )[0]
  const artistRow = async (id: string): Promise<Stored | undefined> =>
    (
      await server.db.rows<Stored>(
        `SELECT model, "contentHash", vector_dims(embedding) AS dims, "updatedAt" FROM "ArtistEmbedding" WHERE "artistId" = $1`,
        [id],
      )
    )[0]

  const createArtist = async (name: string, extra: object = {}) =>
    (
      (
        await http()
          .post("/api/artists")
          .set(admin())
          .send({ name: `${TEST_NAME_PREFIX}${name}`, imageUrl: `${MEDIA}/a.jpg`, ...extra })
          .expect(201)
      ).body as { id: string }
    ).id
  const createTrack = async (artistId: string, extra: object = {}) =>
    (
      (
        await http()
          .post("/api/tracks")
          .set(admin())
          .send({
            title: "E2E vector track",
            artistId,
            coverUrl: `${MEDIA}/c.jpg`,
            youtubeVideoId: "Llw9Q6akRo4",
            durationSec: 200,
            ...extra,
          })
          .expect(201)
      ).body as { id: string }
    ).id

  beforeAll(async () => {
    server = await startTestServer({ EMBEDDING_PROVIDER: "fake" })
    token = await adminToken(server)
  }, 60_000)

  afterAll(async () => {
    await server.stop()
  })

  it("makes the vector of a new track in the background, from the text that describes it", async () => {
    const artistId = await createArtist("Sync artist", { region: "VIETNAM" })
    const trackId = await createTrack(artistId, {
      mood: ["buồn"],
      tags: ["ngày mưa"],
      description: "Bản ballad nhẹ nhàng.",
    })

    const stored = await eventually(() => trackRow(trackId))

    const text = trackEmbeddingText({
      title: "E2E vector track",
      artist: `${TEST_NAME_PREFIX}Sync artist`,
      region: "VIETNAM",
      genres: [],
      mood: ["buồn"],
      tags: ["ngày mưa"],
      description: "Bản ballad nhẹ nhàng.",
    })
    expect(stored.model).toBe(MODEL)
    expect(stored.dims).toBe(768)
    expect(stored.contentHash).toBe(contentHash(text, MODEL))
  })

  it("makes the vector of a new artist too", async () => {
    const artistId = await createArtist("Artist with genres", {
      region: "KOREA",
      genres: ["k-pop"],
      bio: "A girl group.",
    })

    const stored = await eventually(() => artistRow(artistId))

    expect(stored.contentHash).toBe(
      contentHash(
        artistEmbeddingText({
          name: `${TEST_NAME_PREFIX}Artist with genres`,
          region: "KOREA",
          genres: ["k-pop"],
          bio: "A girl group.",
        }),
        MODEL,
      ),
    )
  })

  it("makes a new vector when the description changes", async () => {
    const trackId = await createTrack(await createArtist("Change artist"))
    const before = await eventually(() => trackRow(trackId))

    await http()
      .patch(`/api/tracks/${trackId}`)
      .set(admin())
      .send({ description: "Giờ đã có mô tả." })
      .expect(200)
    const after = await eventually(async () => {
      const row = await trackRow(trackId)
      return row && row.contentHash !== before.contentHash ? row : undefined
    })

    expect(after.updatedAt.getTime()).toBeGreaterThan(before.updatedAt.getTime())
  })

  it("leaves the vector alone when an edit changes nothing that is embedded", async () => {
    const trackId = await createTrack(await createArtist("Same artist"))
    const before = await eventually(() => trackRow(trackId))

    // The duration is not part of the text; saving it again must not cost a call to the model.
    await http().patch(`/api/tracks/${trackId}`).set(admin()).send({ durationSec: 201 }).expect(200)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    const after = await trackRow(trackId)

    expect(after?.contentHash).toBe(before.contentHash)
    expect(after?.updatedAt.getTime()).toBe(before.updatedAt.getTime())
  })

  it("makes the vectors of an artist's tracks again when the artist's name changes", async () => {
    const artistId = await createArtist("Old name")
    const trackId = await createTrack(artistId)
    const before = await eventually(() => trackRow(trackId))

    await http()
      .patch(`/api/artists/${artistId}`)
      .set(admin())
      .send({ name: `${TEST_NAME_PREFIX}New name` })
      .expect(200)
    const after = await eventually(async () => {
      const row = await trackRow(trackId)
      return row && row.contentHash !== before.contentHash ? row : undefined
    })

    expect(after.contentHash).toBe(
      contentHash(
        trackEmbeddingText({
          title: "E2E vector track",
          artist: `${TEST_NAME_PREFIX}New name`,
          region: "GLOBAL",
          genres: [],
          mood: [],
          tags: [],
          description: "",
        }),
        MODEL,
      ),
    )
  })

  it("deleting a track or an artist deletes their vectors", async () => {
    const artistId = await createArtist("Doomed artist")
    const trackId = await createTrack(artistId)
    await eventually(() => trackRow(trackId))
    await eventually(() => artistRow(artistId))

    await http().delete(`/api/tracks/${trackId}`).set(admin()).expect(204)
    expect(await trackRow(trackId)).toBeUndefined()
    await http().delete(`/api/artists/${artistId}`).set(admin()).expect(204)
    expect(await artistRow(artistId)).toBeUndefined()
  })

  describe("npm run ai:embed", () => {
    const embed = (...args: string[]) =>
      run(process.execPath, ["dist/modules/embeddings/cli.js", ...args], {
        env: server.env,
        timeout: 120_000,
      })

    it("brings up to date what changed outside the API, and then has nothing left to do", async () => {
      // Rows written straight to the database send no event, as the seed does.
      const artistId = `${TEST_NAME_PREFIX.trim().replace(/\W/g, "").toLowerCase()}-cli`
      await server.db.run(
        `INSERT INTO "Artist" (id, name, "imageUrl", region) VALUES ($1, $2, $3, 'JAPAN')`,
        [artistId, `${TEST_NAME_PREFIX}CLI artist`, `${MEDIA}/a.jpg`],
      )
      await server.db.run(
        `INSERT INTO "Track" (id, title, "artistId", "coverUrl", "durationSec", "youtubeVideoId")
         VALUES ($1, 'CLI track', $2, $3, 180, 'Llw9Q6akRo4')`,
        [`${artistId}-song`, artistId, `${MEDIA}/c.jpg`],
      )
      expect(await trackRow(`${artistId}-song`)).toBeUndefined()

      const first = await embed()

      expect(first.stdout).toContain(`Model: ${MODEL}`)
      expect(first.stdout).toMatch(/Done\./)
      expect(await trackRow(`${artistId}-song`)).toMatchObject({ model: MODEL, dims: 768 })
      expect(await artistRow(artistId)).toMatchObject({ model: MODEL, dims: 768 })

      const second = await embed()
      expect(second.stdout).toMatch(
        /Artists: 0 made, \d+ up to date\. Tracks: 0 made, \d+ up to date\./,
      )
    }, 240_000)

    it("makes every vector again with --force", async () => {
      const result = await embed("--force")

      expect(result.stdout).toContain("--force")
      expect(result.stdout).not.toMatch(/Tracks: 0 made/)
    }, 240_000)
  })
})

describe("Embeddings without a provider (e2e)", () => {
  it("creating a track still works and makes no vector", async () => {
    const server = await startTestServer()
    try {
      const token = await adminToken(server)
      const auth = { Authorization: `Bearer ${token}` }
      const artist = await request(server.url)
        .post("/api/artists")
        .set(auth)
        .send({ name: `${TEST_NAME_PREFIX}No provider`, imageUrl: `${MEDIA}/a.jpg` })
        .expect(201)
      const artistId = (artist.body as { id: string }).id

      await request(server.url)
        .post("/api/tracks")
        .set(auth)
        .send({
          title: "No vector",
          artistId,
          coverUrl: `${MEDIA}/c.jpg`,
          youtubeVideoId: "Llw9Q6akRo4",
          durationSec: 100,
        })
        .expect(201)
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const rows = await server.db.rows<{ count: string }>(
        `SELECT count(*) FROM "ArtistEmbedding" WHERE "artistId" = $1`,
        [artistId],
      )
      expect(Number(rows[0].count)).toBe(0)
    } finally {
      await server.stop()
    }
  }, 90_000)
})
