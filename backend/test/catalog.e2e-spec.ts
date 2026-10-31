import { afterAll, beforeAll, describe, expect, it } from "@jest/globals"
import request from "supertest"
import {
  startTestServer,
  TEST_NAME_PREFIX,
  uniqueEmail,
  type TestServer,
} from "./helpers/test-server.js"

const IMAGE_URL = "https://media.e2e.test/artists/e2e.jpg"
const AUDIO_URL = "https://media.e2e.test/audio/e2e.mp3"
const VIDEO_ID = "AAAAAAAAAAA"
const OTHER_VIDEO_ID = "b-C_d3EfGh1"

interface ArtistBody {
  id: string
  name: string
  region: string
}

interface TrackBody {
  id: string
  title: string
  youtubeVideoId: string | null
}

interface Page<T> {
  items: T[]
  total: number
}

describe("Catalog regions and YouTube ids (e2e)", () => {
  let server: TestServer
  let adminToken: string
  let seoul: ArtistBody
  let tokyo: ArtistBody
  let plain: ArtistBody
  let seoulTrack: TrackBody
  let tokyoTrack: TrackBody
  const http = () => request(server.url)
  const asAdmin = () => ({ Authorization: `Bearer ${adminToken}` })

  const createArtist = async (name: string, region?: string): Promise<ArtistBody> => {
    const response = await http()
      .post("/api/artists")
      .set(asAdmin())
      .send({
        name: `${TEST_NAME_PREFIX}${name}`,
        imageUrl: IMAGE_URL,
        ...(region ? { region } : {}),
      })
      .expect(201)
    return response.body as ArtistBody
  }

  const trackBody = (artistId: string, title: string, extra: object = {}) => ({
    title,
    artistId,
    coverUrl: IMAGE_URL,
    audioUrl: AUDIO_URL,
    durationSec: 180,
    ...extra,
  })

  beforeAll(async () => {
    server = await startTestServer()

    const credentials = { email: uniqueEmail(), name: "Catalog Admin", password: "password123" }
    await http().post("/api/auth/register").send(credentials).expect(201)
    await server.db.run(`UPDATE "User" SET role = 'ADMIN' WHERE email = $1`, [credentials.email])
    const login = await http()
      .post("/api/auth/login")
      .send({ email: credentials.email, password: credentials.password })
      .expect(200)
    adminToken = (login.body as { accessToken: string }).accessToken

    seoul = await createArtist("Seoul Star", "KOREA")
    tokyo = await createArtist("Tokyo Band", "JAPAN")
    plain = await createArtist("Plain Artist")

    const seoulResponse = await http()
      .post("/api/tracks")
      .set(asAdmin())
      .send(trackBody(seoul.id, "E2E Seoul Song", { youtubeVideoId: VIDEO_ID }))
      .expect(201)
    seoulTrack = seoulResponse.body as TrackBody
    const tokyoResponse = await http()
      .post("/api/tracks")
      .set(asAdmin())
      .send(trackBody(tokyo.id, "E2E Tokyo Song"))
      .expect(201)
    tokyoTrack = tokyoResponse.body as TrackBody
  })

  afterAll(async () => {
    await server.stop()
  })

  describe("artist region", () => {
    it("is returned on every artist and defaults to GLOBAL", async () => {
      expect(seoul.region).toBe("KOREA")
      expect(tokyo.region).toBe("JAPAN")
      expect(plain.region).toBe("GLOBAL")

      const detail = await http().get(`/api/artists/${seoul.id}`).expect(200)
      expect((detail.body as ArtistBody).region).toBe("KOREA")
    })

    it("GET /artists?region= lists only the artists of that region", async () => {
      const korea = await http().get("/api/artists?region=KOREA").expect(200)
      const body = korea.body as Page<ArtistBody>

      expect(body.items.map((artist) => artist.name)).toEqual([`${TEST_NAME_PREFIX}Seoul Star`])
      expect(body.total).toBe(1)
    })

    it("combines with the search text", async () => {
      const response = await http().get("/api/artists?region=JAPAN&q=seoul").expect(200)

      expect((response.body as Page<ArtistBody>).items).toHaveLength(0)
    })

    it("rejects an unknown region with 400", async () => {
      const response = await http().get("/api/artists?region=MARS").expect(400)

      expect(JSON.stringify(response.body)).toContain("region")
    })

    it("can be set and changed by an admin", async () => {
      const response = await http()
        .patch(`/api/artists/${plain.id}`)
        .set(asAdmin())
        .send({ region: "CHINA" })
        .expect(200)

      expect((response.body as ArtistBody).region).toBe("CHINA")
      await http()
        .patch(`/api/artists/${plain.id}`)
        .set(asAdmin())
        .send({ region: "NOWHERE" })
        .expect(400)
      await http()
        .patch(`/api/artists/${plain.id}`)
        .set(asAdmin())
        .send({ region: "GLOBAL" })
        .expect(200)
    })
  })

  describe("track filter and youtubeVideoId", () => {
    it("GET /tracks?region= lists the tracks of the artists from that region", async () => {
      const korea = (await http().get("/api/tracks?region=KOREA").expect(200))
        .body as Page<TrackBody>
      const japan = (await http().get("/api/tracks?region=JAPAN").expect(200))
        .body as Page<TrackBody>
      const global = (await http().get("/api/tracks?region=GLOBAL").expect(200))
        .body as Page<TrackBody>

      expect(korea.items.map((track) => track.id)).toEqual([seoulTrack.id])
      expect(japan.items.map((track) => track.id)).toEqual([tokyoTrack.id])
      expect(global.total).toBe(0)
      expect(korea.total).toBe(1)
    })

    it("combines the region with ?q= and ?artistId=", async () => {
      const noMatch = (await http().get("/api/tracks?region=KOREA&q=Tokyo").expect(200))
        .body as Page<TrackBody>
      const own = (await http().get(`/api/tracks?region=KOREA&artistId=${seoul.id}`).expect(200))
        .body as Page<TrackBody>
      const other = (await http().get(`/api/tracks?region=KOREA&artistId=${tokyo.id}`).expect(200))
        .body as Page<TrackBody>

      expect(noMatch.items).toHaveLength(0)
      expect(own.items).toHaveLength(1)
      expect(other.items).toHaveLength(0)
    })

    it("rejects an unknown region with 400", async () => {
      await http().get("/api/tracks?region=korea").expect(400)
    })

    it("returns youtubeVideoId (null when there is none) in lists and details", async () => {
      expect(seoulTrack.youtubeVideoId).toBe(VIDEO_ID)
      expect(tokyoTrack.youtubeVideoId).toBeNull()

      const detail = await http().get(`/api/tracks/${seoulTrack.id}`).expect(200)
      expect((detail.body as TrackBody).youtubeVideoId).toBe(VIDEO_ID)

      const list = (await http().get("/api/tracks?q=E2E").expect(200)).body as Page<TrackBody>
      const byId = new Map(list.items.map((track) => [track.id, track.youtubeVideoId]))
      expect(byId.get(seoulTrack.id)).toBe(VIDEO_ID)
      expect(byId.get(tokyoTrack.id)).toBeNull()
    })

    it.each(["short", "has space!!", "waytoolongvideoid", "ÀÀÀÀÀÀÀÀÀÀÀ", ""])(
      "rejects the malformed id %p when creating a track",
      async (youtubeVideoId) => {
        await http()
          .post("/api/tracks")
          .set(asAdmin())
          .send(trackBody(seoul.id, "E2E Bad Id", { youtubeVideoId }))
          .expect(400)
      },
    )

    it("accepts ids that contain - and _ and lets an admin change or clear the id", async () => {
      const updated = await http()
        .patch(`/api/tracks/${tokyoTrack.id}`)
        .set(asAdmin())
        .send({ youtubeVideoId: OTHER_VIDEO_ID })
        .expect(200)
      expect((updated.body as TrackBody).youtubeVideoId).toBe(OTHER_VIDEO_ID)

      await http()
        .patch(`/api/tracks/${tokyoTrack.id}`)
        .set(asAdmin())
        .send({ youtubeVideoId: "not valid" })
        .expect(400)

      const cleared = await http()
        .patch(`/api/tracks/${tokyoTrack.id}`)
        .set(asAdmin())
        .send({ youtubeVideoId: null })
        .expect(200)
      expect((cleared.body as TrackBody).youtubeVideoId).toBeNull()
    })

    it("leaves the id alone when an update does not mention it", async () => {
      const response = await http()
        .patch(`/api/tracks/${seoulTrack.id}`)
        .set(asAdmin())
        .send({ title: "E2E Seoul Song (renamed)" })
        .expect(200)

      expect((response.body as TrackBody).youtubeVideoId).toBe(VIDEO_ID)
    })

    it("also carries youtubeVideoId in the tracks of a playlist", async () => {
      const playlist = await http()
        .post("/api/playlists")
        .set(asAdmin())
        .send({ name: `${TEST_NAME_PREFIX}Playlist` })
        .expect(201)
      const playlistId = (playlist.body as { id: string }).id

      const filled = await http()
        .put(`/api/playlists/${playlistId}/tracks/${seoulTrack.id}`)
        .set(asAdmin())
        .expect(200)
      const detail = await http().get(`/api/playlists/${playlistId}`).set(asAdmin()).expect(200)

      for (const body of [filled.body, detail.body] as { tracks: TrackBody[] }[]) {
        expect(body.tracks.map((track) => track.youtubeVideoId)).toEqual([VIDEO_ID])
      }
    })
  })
})
