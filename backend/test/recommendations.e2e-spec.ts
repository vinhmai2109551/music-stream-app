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
const WAIT_MS = 30_000

interface TrackItem {
  id: string
  artistId: string
  title: string
  liked: boolean
}
interface ForYou {
  strategy: "taste" | "popular"
  items: TrackItem[]
}
interface Because {
  basedOn: TrackItem | null
  items: TrackItem[]
}

async function eventually<T>(read: () => Promise<T | undefined>): Promise<T> {
  const deadline = Date.now() + WAIT_MS
  for (;;) {
    const value = await read()
    if (value !== undefined) return value
    if (Date.now() > deadline) throw new Error("Timed out waiting for the embeddings")
    await new Promise((resolve) => setTimeout(resolve, 150))
  }
}

async function register(server: TestServer, role: "USER" | "ADMIN" = "USER"): Promise<string> {
  const credentials = { email: uniqueEmail(), name: "Reco tester", password: "password123" }
  await request(server.url).post("/api/auth/register").send(credentials).expect(201)
  if (role === "ADMIN") {
    await server.db.run(`UPDATE "User" SET role = 'ADMIN' WHERE email = $1`, [credentials.email])
  }
  const login = await request(server.url)
    .post("/api/auth/login")
    .send({ email: credentials.email, password: credentials.password })
    .expect(200)
  return (login.body as { accessToken: string }).accessToken
}

describe("Recommendations (e2e)", () => {
  let server: TestServer
  let admin: string
  const http = () => request(server.url)
  const as = (token: string) => ({ Authorization: `Bearer ${token}` })
  const forYou = async (token: string, params: Record<string, string | number> = {}) =>
    (await http().get("/api/recommendations/for-you").set(as(token)).query(params).expect(200))
      .body as ForYou
  const because = async (token: string, params: Record<string, string | number> = {}) =>
    (
      await http()
        .get("/api/recommendations/because-you-listened")
        .set(as(token))
        .query(params)
        .expect(200)
    ).body as Because
  const similar = (id: string, token?: string, params: Record<string, string | number> = {}) => {
    const call = http().get(`/api/tracks/${id}/similar`).query(params)
    return token ? call.set(as(token)) : call
  }

  const ids: { rainArtist?: string; gymArtist?: string; rain: string[]; gym: string[] } = {
    rain: [],
    gym: [],
  }

  const createArtist = async (name: string, region: string) =>
    (
      (
        await http()
          .post("/api/artists")
          .set(as(admin))
          .send({ name: `${TEST_NAME_PREFIX}${name}`, imageUrl: `${MEDIA}/a.jpg`, region })
          .expect(201)
      ).body as { id: string }
    ).id
  const createTrack = async (artistId: string, title: string, description: string, mood: string) =>
    (
      (
        await http()
          .post("/api/tracks")
          .set(as(admin))
          .send({
            title,
            artistId,
            coverUrl: `${MEDIA}/c.jpg`,
            youtubeVideoId: "Llw9Q6akRo4",
            durationSec: 200,
            description,
            mood: [mood],
          })
          .expect(201)
      ).body as { id: string }
    ).id
  const hasVector = async (id: string) =>
    (await server.db.rows(`SELECT 1 FROM "TrackEmbedding" WHERE "trackId" = $1`, [id])).length > 0
      ? true
      : undefined

  beforeAll(async () => {
    server = await startTestServer({ EMBEDDING_PROVIDER: "fake" })
    admin = await register(server, "ADMIN")

    ids.rainArtist = await createArtist("Reco Rain Artist", "VIETNAM")
    ids.gymArtist = await createArtist("Reco Gym Artist", "KOREA")
    // Five tracks by one artist per mood: more than the three an artist may fill in a list.
    for (let index = 0; index < 5; index += 1) {
      ids.rain.push(
        await createTrack(
          ids.rainArtist,
          `Reco Mưa ${index}`,
          "Nhạc buồn ngày mưa nhẹ nhàng, hợp nghe một mình, giai điệu trầm lắng.",
          "buồn",
        ),
      )
      ids.gym.push(
        await createTrack(
          ids.gymArtist,
          `Reco Gym ${index}`,
          "Nhạc tập gym K-Pop sôi động, nhịp mạnh, nhiều năng lượng.",
          "sôi động",
        ),
      )
    }
    for (const id of [...ids.rain, ...ids.gym]) await eventually(() => hasVector(id))
    // The most played tracks of the test catalog, so the cold start has something to pick.
    await server.db.run(`UPDATE "Track" SET plays = 5000000 WHERE id = $1`, [ids.gym[0]])
  }, START_TIMEOUT_MS * 2)

  afterAll(async () => {
    await server.stop()
  })

  describe("who may ask", () => {
    it("for-you and because-you-listened need a signed-in user", async () => {
      await http().get("/api/recommendations/for-you").expect(401)
      await http().get("/api/recommendations/because-you-listened").expect(401)
    })

    it("similar tracks are public", async () => {
      await similar(ids.rain[0]).expect(200)
    })
  })

  describe("what is not accepted", () => {
    it.each([
      ["a limit of 0", { limit: 0 }],
      ["a limit of 21", { limit: 21 }],
      ["a limit that is not a number", { limit: "many" }],
      ["a region that does not exist", { region: "MARS" }],
    ])("answers 400 for %s", async (_name, params) => {
      const token = await register(server)
      await http()
        .get("/api/recommendations/for-you")
        .set(as(token))
        .query(params as Record<string, string | number>)
        .expect(400)
    })

    it("answers 404 for the similar tracks of a track that does not exist", async () => {
      await similar("no-such-track").expect(404)
    })
  })

  describe("a new user (cold start)", () => {
    it("gets what is popular, at most three tracks per artist", async () => {
      const token = await register(server)
      const { strategy, items } = await forYou(token, { limit: 20 })

      expect(strategy).toBe("popular")
      expect(items[0].id).toBe(ids.gym[0])
      const perArtist = new Map<string, number>()
      for (const item of items)
        perArtist.set(item.artistId, (perArtist.get(item.artistId) ?? 0) + 1)
      expect(Math.max(...perArtist.values())).toBeLessThanOrEqual(3)
    })

    it("gets the popular tracks of the region asked for", async () => {
      const token = await register(server)
      const { items } = await forYou(token, { region: "VIETNAM", limit: 20 })

      expect(items.map((item) => item.id)).not.toContain(ids.gym[0])
      expect(items.every((item) => item.artistId !== ids.gymArtist)).toBe(true)
    })

    it("has nothing to say 'because you listened'", async () => {
      const token = await register(server)

      expect(await because(token)).toEqual({ basedOn: null, items: [] })
    })
  })

  describe("a user with a taste", () => {
    it("who likes a rainy track gets rainy tracks, not the one they liked, three per artist at most", async () => {
      const token = await register(server)
      await http().put(`/api/likes/tracks/${ids.rain[0]}`).set(as(token)).expect(200)

      const { strategy, items } = await forYou(token, { limit: 4 })

      expect(strategy).toBe("taste")
      expect(items.map((item) => item.id)).not.toContain(ids.rain[0])
      expect(items).toHaveLength(4)
      // Three of the four are by the rainy artist (the cap); the closest of the rest is next.
      expect(items.filter((item) => item.artistId === ids.rainArtist)).toHaveLength(3)
      expect(items.slice(0, 3).every((item) => ids.rain.includes(item.id))).toBe(true)
    })

    it("who likes gym tracks is not given rainy ones first", async () => {
      const token = await register(server)
      await http().put(`/api/likes/tracks/${ids.gym[1]}`).set(as(token)).expect(200)

      const { items } = await forYou(token, { limit: 3 })

      expect(items.every((item) => ids.gym.includes(item.id))).toBe(true)
    })

    it("counts a like more than a listen", async () => {
      const token = await register(server)
      await http().put(`/api/likes/tracks/${ids.rain[1]}`).set(as(token)).expect(200)
      await http().post(`/api/tracks/${ids.gym[2]}/play`).set(as(token)).expect(200)

      const { items } = await forYou(token, { limit: 2 })

      expect(ids.rain).toContain(items[0].id)
    })

    it("does not offer a track the user listened to", async () => {
      const token = await register(server)
      await http().put(`/api/likes/tracks/${ids.rain[0]}`).set(as(token)).expect(200)
      await http().post(`/api/tracks/${ids.rain[1]}/play`).set(as(token)).expect(200)

      const { items } = await forYou(token, { limit: 20 })

      expect(items.map((item) => item.id)).not.toContain(ids.rain[1])
    })

    it("keeps to the region asked for", async () => {
      const token = await register(server)
      await http().put(`/api/likes/tracks/${ids.rain[0]}`).set(as(token)).expect(200)

      const { items } = await forYou(token, { region: "KOREA", limit: 20 })

      expect(items.length).toBeGreaterThan(0)
      expect(items.every((item) => item.artistId === ids.gymArtist)).toBe(true)
    })
  })

  describe("because you listened", () => {
    it("is based on the track listened to last, which it does not offer again", async () => {
      const token = await register(server)
      await http().post(`/api/tracks/${ids.rain[3]}/play`).set(as(token)).expect(200)
      await http().post(`/api/tracks/${ids.gym[3]}/play`).set(as(token)).expect(200)

      const result = await because(token, { limit: 3 })

      expect(result.basedOn?.id).toBe(ids.gym[3])
      expect(result.items.map((item) => item.id)).not.toContain(ids.gym[3])
      expect(result.items.map((item) => item.id)).not.toContain(ids.rain[3])
      expect(result.items.every((item) => ids.gym.includes(item.id))).toBe(true)
    })
  })

  describe("similar tracks", () => {
    it("are the nearest ones, not the track itself, three per artist at most", async () => {
      const response = await similar(ids.rain[0], undefined, { limit: 5 }).expect(200)
      const items = (response.body as { items: TrackItem[] }).items

      expect(items).toHaveLength(5)
      expect(items.map((item) => item.id)).not.toContain(ids.rain[0])
      expect(items.filter((item) => item.artistId === ids.rainArtist)).toHaveLength(3)
      expect(items.slice(0, 3).every((item) => ids.rain.includes(item.id))).toBe(true)
    })

    it("tell a signed-in user which of them they liked", async () => {
      const token = await register(server)
      // The artist fills three places, so like all four other tracks: whichever three come, they are liked.
      for (const id of ids.rain.slice(1)) {
        await http().put(`/api/likes/tracks/${id}`).set(as(token)).expect(200)
      }

      const response = await similar(ids.rain[0], token, { limit: 20 }).expect(200)
      const items = (response.body as { items: TrackItem[] }).items
      const rainy = items.filter((item) => item.artistId === ids.rainArtist)

      expect(rainy).toHaveLength(3)
      expect(rainy.every((item) => item.liked)).toBe(true)
      expect(items.filter((item) => item.artistId === ids.gymArtist).every((i) => !i.liked)).toBe(
        true,
      )
    })
  })
})

describe("Recommendations when semantic features are off (e2e)", () => {
  it(
    "hides similar and because-you-listened with 503, and for-you still answers with what is popular",
    async () => {
      const server = await startTestServer()
      try {
        const token = await register(server)
        const auth = { Authorization: `Bearer ${token}` }

        await request(server.url)
          .get("/api/recommendations/because-you-listened")
          .set(auth)
          .expect(503)
        // The check comes before the lookup, so any id answers 503.
        await request(server.url).get("/api/tracks/any-track/similar").expect(503)
        const result = await request(server.url)
          .get("/api/recommendations/for-you")
          .set(auth)
          .expect(200)
        expect((result.body as ForYou).strategy).toBe("popular")
      } finally {
        await server.stop()
      }
    },
    START_TIMEOUT_MS,
  )
})
