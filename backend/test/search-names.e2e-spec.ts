import { afterAll, beforeAll, describe, expect, it } from "@jest/globals"
import request from "supertest"
import {
  startTestServer,
  TEST_NAME_PREFIX,
  uniqueEmail,
  type TestServer,
} from "./helpers/test-server.js"

const MEDIA = "https://media.example.com"
const START_TIMEOUT_MS = 60_000

async function adminToken(server: TestServer): Promise<string> {
  const credentials = { email: uniqueEmail(), name: "Search admin", password: "password123" }
  await request(server.url).post("/api/auth/register").send(credentials).expect(201)
  await server.db.run(`UPDATE "User" SET role = 'ADMIN' WHERE email = $1`, [credentials.email])
  const login = await request(server.url)
    .post("/api/auth/login")
    .send({ email: credentials.email, password: credentials.password })
    .expect(200)
  return (login.body as { accessToken: string }).accessToken
}

interface Item {
  id: string
  name?: string
  title?: string
}

describe("Searching without accents (e2e)", () => {
  let server: TestServer
  let token: string
  const http = () => request(server.url)
  const admin = () => ({ Authorization: `Bearer ${token}` })

  const ids = async (path: string): Promise<string[]> => {
    const response = await http().get(path).expect(200)
    return (response.body as { items: Item[] }).items.map((item) => item.id)
  }

  const createArtist = async (name: string) =>
    (
      (
        await http()
          .post("/api/artists")
          .set(admin())
          .send({ name: `${TEST_NAME_PREFIX}${name}`, imageUrl: `${MEDIA}/a.jpg` })
          .expect(201)
      ).body as { id: string }
    ).id
  const createTrack = async (artistId: string, title: string) =>
    (
      (
        await http()
          .post("/api/tracks")
          .set(admin())
          .send({
            title,
            artistId,
            coverUrl: `${MEDIA}/c.jpg`,
            youtubeVideoId: "Llw9Q6akRo4",
            durationSec: 200,
          })
          .expect(201)
      ).body as { id: string }
    ).id

  beforeAll(async () => {
    server = await startTestServer()
    token = await adminToken(server)
  }, START_TIMEOUT_MS)

  afterAll(async () => {
    await server.stop()
  })

  describe("artists, tracks, albums and playlists", () => {
    let artistId: string
    let trackId: string
    let albumId: string
    let playlistId: string

    beforeAll(async () => {
      artistId = await createArtist("Sơn Tùng Tìm Kiếm")
      trackId = await createTrack(artistId, "Lạc Trôi Tìm Kiếm")
      albumId = (
        (
          await http()
            .post("/api/albums")
            .set(admin())
            .send({
              title: "Hoàng Thùy Linh Tìm Kiếm",
              artistId,
              coverUrl: `${MEDIA}/al.jpg`,
              trackIds: [trackId],
            })
            .expect(201)
        ).body as { id: string }
      ).id
      playlistId = (
        (
          await http()
            .post("/api/playlists")
            .set(admin())
            .send({ name: `${TEST_NAME_PREFIX}Nhạc Việt Tìm Kiếm`, isOfficial: true })
            .expect(201)
        ).body as { id: string }
      ).id
    })

    afterAll(async () => {
      await http().delete(`/api/playlists/${playlistId}`).set(admin())
    })

    it("'son tung' finds the artist 'Sơn Tùng'", async () => {
      expect(await ids("/api/artists?q=son%20tung%20tim%20kiem")).toContain(artistId)
    })

    it("finds it whatever the case and accents of what is typed", async () => {
      for (const q of [
        "SON TUNG TIM KIEM",
        "Sơn Tùng Tìm Kiếm",
        "sơn tung tim kiếm",
        "son   tung",
      ]) {
        expect(await ids(`/api/artists?q=${encodeURIComponent(q)}`)).toContain(artistId)
      }
    })

    it("a partial word matches too", async () => {
      expect(await ids("/api/artists?q=tim%20ki")).toContain(artistId)
    })

    it("'lac troi' finds the track 'Lạc Trôi'", async () => {
      expect(await ids("/api/tracks?q=lac%20troi%20tim%20kiem")).toContain(trackId)
    })

    it("a track is found by the name of its artist, typed without accents", async () => {
      expect(await ids("/api/tracks?q=son%20tung%20tim%20kiem")).toContain(trackId)
    })

    it("'hoang thuy linh' finds the album", async () => {
      expect(await ids("/api/albums?q=hoang%20thuy%20linh%20tim%20kiem")).toContain(albumId)
    })

    it("'nhac viet' finds the official playlist", async () => {
      expect(await ids("/api/playlists?q=nhac%20viet%20tim%20kiem")).toContain(playlistId)
    })

    it("does not find what does not match", async () => {
      expect(await ids("/api/artists?q=khong%20co%20ai%20ten%20nhu%20vay%20e2e")).toEqual([])
    })

    it("the letters with accents typed as they are still work, as before", async () => {
      expect(await ids(`/api/artists?q=${encodeURIComponent("Tùng Tìm")}`)).toContain(artistId)
    })

    it("searching for punctuation only does not return everything", async () => {
      const response = await http().get("/api/artists?q=!!!").expect(200)

      expect((response.body as { items: unknown[] }).items).toEqual([])
    })
  })

  describe("when a name changes", () => {
    it("the artist is found by the new name and no longer by the old one", async () => {
      const artistId = await createArtist("Tên Cũ Đổi")

      await http()
        .patch(`/api/artists/${artistId}`)
        .set(admin())
        .send({ name: `${TEST_NAME_PREFIX}Đen Vâu Đổi` })
        .expect(200)

      expect(await ids("/api/artists?q=den%20vau%20doi")).toContain(artistId)
      expect(await ids("/api/artists?q=ten%20cu%20doi")).not.toContain(artistId)
    })

    it("the track is found by the new title", async () => {
      const artistId = await createArtist("Đổi Tên Bài")
      const trackId = await createTrack(artistId, "Bài Cũ Rích")

      await http()
        .patch(`/api/tracks/${trackId}`)
        .set(admin())
        .send({ title: "Bài Mới Tinh" })
        .expect(200)

      expect(await ids("/api/tracks?q=bai%20moi%20tinh")).toContain(trackId)
      expect(await ids("/api/tracks?q=bai%20cu%20rich")).not.toContain(trackId)
    })

    it("changing something else leaves the search name alone", async () => {
      const artistId = await createArtist("Giữ Nguyên Tên")
      const trackId = await createTrack(artistId, "Bài Giữ Nguyên")

      await http()
        .patch(`/api/tracks/${trackId}`)
        .set(admin())
        .send({ durationSec: 99 })
        .expect(200)

      expect(await ids("/api/tracks?q=bai%20giu%20nguyen")).toContain(trackId)
    })

    it("a renamed playlist is found by its new name", async () => {
      const created = await http()
        .post("/api/playlists")
        .set(admin())
        .send({ name: `${TEST_NAME_PREFIX}Tên Playlist Cũ`, isOfficial: true })
        .expect(201)
      const id = (created.body as { id: string }).id
      try {
        await http()
          .patch(`/api/playlists/${id}`)
          .set(admin())
          .send({ name: `${TEST_NAME_PREFIX}Chạy Bộ Buổi Sáng` })
          .expect(200)

        expect(await ids("/api/playlists?q=chay%20bo%20buoi%20sang")).toContain(id)
        expect(await ids("/api/playlists?q=ten%20playlist%20cu")).not.toContain(id)
      } finally {
        await http().delete(`/api/playlists/${id}`).set(admin())
      }
    })
  })

  describe("rows written straight into the database", () => {
    it(
      "get their search name when the API starts, and are found without accents",
      async () => {
        const artistId = `${TEST_NAME_PREFIX.trim().toLowerCase()}-backfill-artist`
        await server.db.run(`INSERT INTO "Artist" (id, name, "imageUrl") VALUES ($1, $2, $3)`, [
          artistId,
          `${TEST_NAME_PREFIX}Mỹ Tâm Backfill`,
          `${MEDIA}/a.jpg`,
        ])
        await server.db.run(
          `INSERT INTO "Track" (id, title, "artistId", "coverUrl", "durationSec", "youtubeVideoId")
         VALUES ($1, $2, $3, $4, 100, 'Llw9Q6akRo4')`,
          [`${artistId}-song`, "Đã Có Từ Trước", artistId, `${MEDIA}/c.jpg`],
        )
        const before = await server.db.rows<{ searchName: string | null }>(
          `SELECT "searchName" FROM "Artist" WHERE id = $1`,
          [artistId],
        )
        expect(before[0].searchName).toBeNull()

        // A second API on the same database: its start fills in what is missing.
        const second = await startTestServer()
        try {
          const artist = await server.db.rows<{ searchName: string }>(
            `SELECT "searchName" FROM "Artist" WHERE id = $1`,
            [artistId],
          )
          const track = await server.db.rows<{ searchName: string }>(
            `SELECT "searchName" FROM "Track" WHERE id = $1`,
            [`${artistId}-song`],
          )
          expect(artist[0].searchName).toBe("e2e my tam backfill")
          expect(track[0].searchName).toBe("da co tu truoc")
          expect(await ids("/api/artists?q=my%20tam%20backfill")).toContain(artistId)
        } finally {
          await second.stop()
        }
      },
      START_TIMEOUT_MS * 2,
    )
  })
})
