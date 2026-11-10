import { afterAll, beforeAll, describe, expect, it } from "@jest/globals"
import request from "supertest"
import {
  startTestServer,
  TEST_NAME_PREFIX,
  uniqueEmail,
  type TestServer,
} from "./helpers/test-server.js"

const MEDIA = "https://media.example.com"

async function adminToken(server: TestServer): Promise<string> {
  const credentials = { email: uniqueEmail(), name: "Metadata admin", password: "password123" }
  await request(server.url).post("/api/auth/register").send(credentials).expect(201)
  await server.db.run(`UPDATE "User" SET role = 'ADMIN' WHERE email = $1`, [credentials.email])
  const login = await request(server.url)
    .post("/api/auth/login")
    .send({ email: credentials.email, password: credentials.password })
    .expect(200)
  return (login.body as { accessToken: string }).accessToken
}

describe("Genres, moods, tags and descriptions (e2e)", () => {
  let server: TestServer
  let token: string
  let artistId: string
  const http = () => request(server.url)
  const admin = () => ({ Authorization: `Bearer ${token}` })
  const newTrack = (extra: object = {}) => ({
    title: "E2E metadata track",
    artistId,
    coverUrl: `${MEDIA}/c.jpg`,
    youtubeVideoId: "Llw9Q6akRo4",
    durationSec: 200,
    ...extra,
  })

  beforeAll(async () => {
    server = await startTestServer()
    token = await adminToken(server)
    const artist = await http()
      .post("/api/artists")
      .set(admin())
      .send({ name: `${TEST_NAME_PREFIX}Metadata artist`, imageUrl: `${MEDIA}/a.jpg` })
      .expect(201)
    artistId = (artist.body as { id: string }).id
  }, 60_000)

  afterAll(async () => {
    await server.stop()
  })

  describe("tracks", () => {
    it("a track created without metadata has empty lists and no language", async () => {
      const created = await http().post("/api/tracks").set(admin()).send(newTrack()).expect(201)

      expect(created.body).toMatchObject({
        genres: [],
        mood: [],
        tags: [],
        description: "",
        language: null,
      })
    })

    it("saves what the admin sends and returns it on create, read and list", async () => {
      const metadata = {
        genres: ["v-pop", "ballad"],
        mood: ["buồn", "hoài niệm"],
        tags: ["ngày mưa", "piano"],
        description: "Bản ballad nhẹ nhàng, hợp nghe lúc trời mưa.",
        language: "vi",
      }

      const created = await http()
        .post("/api/tracks")
        .set(admin())
        .send(newTrack(metadata))
        .expect(201)
      const id = (created.body as { id: string }).id
      const read = await http().get(`/api/tracks/${id}`).expect(200)
      const listed = await http().get(`/api/tracks?artistId=${artistId}&limit=50`).expect(200)

      expect(created.body).toMatchObject(metadata)
      expect(read.body).toMatchObject(metadata)
      const row = (listed.body as { items: { id: string }[] }).items.find((item) => item.id === id)
      expect(row).toMatchObject(metadata)
    })

    it("changes the metadata alone with PATCH and keeps the rest", async () => {
      const created = await http()
        .post("/api/tracks")
        .set(admin())
        .send(newTrack({ mood: ["vui"], tags: ["gym"] }))
        .expect(201)
      const id = (created.body as { id: string }).id

      const patched = await http()
        .patch(`/api/tracks/${id}`)
        .set(admin())
        .send({ mood: ["sôi động"], language: "ko" })
        .expect(200)

      expect(patched.body).toMatchObject({
        mood: ["sôi động"],
        tags: ["gym"],
        language: "ko",
        title: "E2E metadata track",
      })
    })

    it("lets the admin clear the language with null", async () => {
      const created = await http()
        .post("/api/tracks")
        .set(admin())
        .send(newTrack({ language: "vi" }))
        .expect(201)
      const id = (created.body as { id: string }).id

      const patched = await http()
        .patch(`/api/tracks/${id}`)
        .set(admin())
        .send({ language: null })
        .expect(200)

      expect((patched.body as { language: string | null }).language).toBeNull()
    })

    it.each([
      ["11 genres", { genres: Array(11).fill("x") }],
      ["11 moods", { mood: Array(11).fill("x") }],
      ["11 tags", { tags: Array(11).fill("x") }],
      ["a genre of 41 characters", { genres: ["x".repeat(41)] }],
      ["a blank tag", { tags: ["   "] }],
      ["a tag that is not text", { tags: [5] }],
      ["tags that are not a list", { tags: "gym" }],
      ["a description of 601 characters", { description: "x".repeat(601) }],
      ["a description that is not text", { description: 5 }],
      ["an upper case language", { language: "VI" }],
      ["a language that is a word", { language: "vietnamese" }],
      ["a one-letter language", { language: "v" }],
    ])("refuses %s with 400", async (_name, extra) => {
      await http().post("/api/tracks").set(admin()).send(newTrack(extra)).expect(400)
    })

    it("accepts the limits exactly: 10 entries, 40 characters, 600 characters", async () => {
      await http()
        .post("/api/tracks")
        .set(admin())
        .send(
          newTrack({
            genres: Array(10).fill("g"),
            mood: ["m".repeat(40)],
            description: "d".repeat(600),
          }),
        )
        .expect(201)
    })

    it("refuses the same problems when updating", async () => {
      const created = await http().post("/api/tracks").set(admin()).send(newTrack()).expect(201)
      const id = (created.body as { id: string }).id

      await http()
        .patch(`/api/tracks/${id}`)
        .set(admin())
        .send({ tags: Array(11).fill("x") })
        .expect(400)
      await http().patch(`/api/tracks/${id}`).set(admin()).send({ language: "xx1" }).expect(400)
    })

    it("only an admin can set them", async () => {
      const credentials = { email: uniqueEmail(), name: "Plain user", password: "password123" }
      const registered = await http().post("/api/auth/register").send(credentials).expect(201)
      const userToken = (registered.body as { accessToken: string }).accessToken

      await http()
        .post("/api/tracks")
        .set("Authorization", `Bearer ${userToken}`)
        .send(newTrack({ mood: ["vui"] }))
        .expect(403)
    })
  })

  describe("artists", () => {
    it("saves genres on create and update and returns them", async () => {
      const created = await http()
        .post("/api/artists")
        .set(admin())
        .send({
          name: `${TEST_NAME_PREFIX}Genre artist`,
          imageUrl: `${MEDIA}/g.jpg`,
          genres: ["v-pop", "pop"],
        })
        .expect(201)
      const id = (created.body as { id: string }).id

      expect(created.body).toMatchObject({ genres: ["v-pop", "pop"] })
      const patched = await http()
        .patch(`/api/artists/${id}`)
        .set(admin())
        .send({ genres: ["rock"] })
        .expect(200)
      expect(patched.body).toMatchObject({ genres: ["rock"] })
      const read = await http().get(`/api/artists/${id}`).expect(200)
      expect(read.body).toMatchObject({ genres: ["rock"], name: `${TEST_NAME_PREFIX}Genre artist` })
    })

    it("has no genres unless set", async () => {
      const read = await http().get(`/api/artists/${artistId}`).expect(200)

      expect((read.body as { genres: string[] }).genres).toEqual([])
    })

    it.each([
      ["11 genres", Array(11).fill("x")],
      ["a genre of 41 characters", ["x".repeat(41)]],
      ["a blank genre", [" "]],
      ["genres that are not a list", "pop"],
    ])("refuses %s with 400", async (_name, genres) => {
      await http()
        .post("/api/artists")
        .set(admin())
        .send({ name: `${TEST_NAME_PREFIX}Bad`, imageUrl: `${MEDIA}/b.jpg`, genres })
        .expect(400)
    })
  })
})
