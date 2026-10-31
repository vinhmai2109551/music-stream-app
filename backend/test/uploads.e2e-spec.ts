import { afterAll, beforeAll, describe, expect, it } from "@jest/globals"
import request from "supertest"
import {
  startTestServer,
  TEST_NAME_PREFIX,
  uniqueEmail,
  type TestServer,
} from "./helpers/test-server.js"

const PUBLIC_URL = "https://media.e2e.test"
const MEGABYTE = 1024 * 1024
const KEY_PATTERN = /^(audio|image)\/\d{4}\/(0[1-9]|1[0-2])\/[a-z0-9]+\.(mp3|m4a|aac|jpg|png|webp)$/

// The credentials are fake: presigning is a local computation and never contacts R2.
const R2_ENV = {
  R2_ACCOUNT_ID: "e2eaccount",
  R2_ACCESS_KEY_ID: "AKIAE2EEXAMPLE",
  R2_SECRET_ACCESS_KEY: "e2e-not-a-real-secret",
  R2_BUCKET: "e2e-bucket",
  R2_PUBLIC_URL: PUBLIC_URL,
}

async function createAccount(server: TestServer, role: "USER" | "ADMIN"): Promise<string> {
  const credentials = { email: uniqueEmail(), name: `Uploads ${role}`, password: "password123" }
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

describe("Uploads (e2e)", () => {
  let server: TestServer
  let adminToken: string
  let userToken: string
  const http = () => request(server.url)
  const asAdmin = () => ({ Authorization: `Bearer ${adminToken}` })
  const presign = (body: object, token = adminToken) =>
    http().post("/api/uploads/presign").set("Authorization", `Bearer ${token}`).send(body)

  beforeAll(async () => {
    server = await startTestServer(R2_ENV)
    adminToken = await createAccount(server, "ADMIN")
    userToken = await createAccount(server, "USER")
  })

  afterAll(async () => {
    await server.stop()
  })

  describe("POST /uploads/presign", () => {
    it("is admin only: 401 without a token, 403 for a normal user", async () => {
      const body = { kind: "image", contentType: "image/png", sizeBytes: 1000 }

      await http().post("/api/uploads/presign").send(body).expect(401)
      await presign(body, userToken).expect(403)
    })

    it("returns uploadUrl, publicUrl and key for an audio file", async () => {
      const response = await presign({
        kind: "audio",
        contentType: "audio/mpeg",
        sizeBytes: 3 * MEGABYTE,
      }).expect(200)
      const { uploadUrl, publicUrl, key } = response.body as Record<string, string>

      expect(Object.keys(response.body as object).sort()).toEqual(["key", "publicUrl", "uploadUrl"])
      expect(key).toMatch(KEY_PATTERN)
      expect(key.startsWith("audio/")).toBe(true)
      expect(key.endsWith(".mp3")).toBe(true)
      expect(publicUrl).toBe(`${PUBLIC_URL}/${key}`)

      const url = new URL(uploadUrl)
      expect(url.host).toContain("e2eaccount.r2.cloudflarestorage.com")
      expect(url.pathname).toContain(key)
      expect(url.searchParams.get("X-Amz-Expires")).toBe("300")
      expect(url.searchParams.get("X-Amz-Signature")).toMatch(/^[0-9a-f]{64}$/)
    })

    it("uses the current year and month in the key", async () => {
      const now = new Date()
      const response = await presign({
        kind: "image",
        contentType: "image/webp",
        sizeBytes: 100,
      }).expect(200)
      const month = String(now.getUTCMonth() + 1).padStart(2, "0")

      expect((response.body as { key: string }).key).toContain(
        `image/${now.getUTCFullYear()}/${month}/`,
      )
    })

    it("never reuses a key", async () => {
      const body = { kind: "image", contentType: "image/png", sizeBytes: 100 }
      const [a, b] = await Promise.all([presign(body), presign(body)])

      expect((a.body as { key: string }).key).not.toBe((b.body as { key: string }).key)
    })

    it.each([
      [
        "a content type that is not allowed",
        { kind: "image", contentType: "image/gif", sizeBytes: 10 },
      ],
      ["an image type sent as audio", { kind: "audio", contentType: "image/png", sizeBytes: 10 }],
      ["an audio type sent as image", { kind: "image", contentType: "audio/mpeg", sizeBytes: 10 }],
      [
        "audio over 20 MB",
        { kind: "audio", contentType: "audio/mpeg", sizeBytes: 20 * MEGABYTE + 1 },
      ],
      [
        "an image over 5 MB",
        { kind: "image", contentType: "image/png", sizeBytes: 5 * MEGABYTE + 1 },
      ],
      ["a size of zero", { kind: "image", contentType: "image/png", sizeBytes: 0 }],
      ["a fractional size", { kind: "image", contentType: "image/png", sizeBytes: 1.5 }],
      ["an unknown kind", { kind: "video", contentType: "video/mp4", sizeBytes: 10 }],
      ["a missing field", { kind: "image", contentType: "image/png" }],
      ["an unexpected field", { kind: "image", contentType: "image/png", sizeBytes: 10, key: "x" }],
    ])("rejects %s with 400", async (_name, body) => {
      await presign(body).expect(400)
    })

    it("accepts files of exactly the maximum size", async () => {
      await presign({ kind: "audio", contentType: "audio/aac", sizeBytes: 20 * MEGABYTE }).expect(
        200,
      )
      await presign({ kind: "image", contentType: "image/jpeg", sizeBytes: 5 * MEGABYTE }).expect(
        200,
      )
    })
  })

  describe("media URLs of artists, tracks and albums", () => {
    const inBucket = (path: string) => `${PUBLIC_URL}/${path}`
    const foreign = "https://example.com/cover.png"

    it("rejects an artist image outside our storage and accepts one inside", async () => {
      const artist = { name: `${TEST_NAME_PREFIX}Artist`, imageUrl: foreign }

      await http().post("/api/artists").set(asAdmin()).send(artist).expect(400)
      await http()
        .post("/api/artists")
        .set(asAdmin())
        .send({ ...artist, imageUrl: inBucket("image/2026/10/a.png") })
        .expect(201)
    })

    it("does not accept a look-alike host", async () => {
      await http()
        .post("/api/artists")
        .set(asAdmin())
        .send({ name: `${TEST_NAME_PREFIX}Fake`, imageUrl: `${PUBLIC_URL}.evil.com/a.png` })
        .expect(400)
    })

    it("checks track and album URLs on create and on update", async () => {
      const artist = await http()
        .post("/api/artists")
        .set(asAdmin())
        .send({ name: `${TEST_NAME_PREFIX}Owner`, imageUrl: inBucket("image/2026/10/o.png") })
        .expect(201)
      const artistId = (artist.body as { id: string }).id
      const track = {
        title: "E2E track",
        artistId,
        coverUrl: inBucket("image/2026/10/c.png"),
        audioUrl: inBucket("audio/2026/10/t.mp3"),
        durationSec: 120,
      }

      await http()
        .post("/api/tracks")
        .set(asAdmin())
        .send({ ...track, audioUrl: foreign })
        .expect(400)
      await http()
        .post("/api/tracks")
        .set(asAdmin())
        .send({ ...track, coverUrl: foreign })
        .expect(400)
      const created = await http().post("/api/tracks").set(asAdmin()).send(track).expect(201)
      const trackId = (created.body as { id: string }).id

      await http()
        .patch(`/api/tracks/${trackId}`)
        .set(asAdmin())
        .send({ audioUrl: foreign })
        .expect(400)
      await http()
        .patch(`/api/tracks/${trackId}`)
        .set(asAdmin())
        .send({ title: "Renamed" }) // no URL in the body: nothing to check
        .expect(200)

      const album = { title: "E2E album", artistId, coverUrl: foreign }
      await http().post("/api/albums").set(asAdmin()).send(album).expect(400)
      await http()
        .post("/api/albums")
        .set(asAdmin())
        .send({ ...album, coverUrl: inBucket("image/2026/10/al.png"), trackIds: [trackId] })
        .expect(201)
    })
  })
})

describe("Uploads without R2 configured (e2e)", () => {
  let server: TestServer

  beforeAll(async () => {
    server = await startTestServer() // the test defaults leave every R2_* setting blank
  })

  afterAll(async () => {
    await server.stop()
  })

  it("presign answers 503 instead of crashing", async () => {
    const token = await createAccount(server, "ADMIN")

    await request(server.url)
      .post("/api/uploads/presign")
      .set("Authorization", `Bearer ${token}`)
      .send({ kind: "image", contentType: "image/png", sizeBytes: 10 })
      .expect(503)
  })

  it("any media URL is accepted (development)", async () => {
    const token = await createAccount(server, "ADMIN")

    await request(server.url)
      .post("/api/artists")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: `${TEST_NAME_PREFIX}Dev`, imageUrl: "https://example.com/a.png" })
      .expect(201)
  })
})
