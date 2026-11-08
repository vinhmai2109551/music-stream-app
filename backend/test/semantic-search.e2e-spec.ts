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
const WAIT_MS = 20_000

interface Hit {
  score: number
  sources: string[]
  track?: { id: string; title: string }
  artist?: { id: string; name: string }
}
interface Result {
  query: string
  type: string
  degraded: boolean
  items: Hit[]
}

async function eventually<T>(read: () => Promise<T | undefined>, timeoutMs = WAIT_MS): Promise<T> {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    const value = await read()
    if (value !== undefined) return value
    if (Date.now() > deadline) throw new Error("Timed out waiting for the embeddings")
    await new Promise((resolve) => setTimeout(resolve, 150))
  }
}

async function register(server: TestServer, role: "USER" | "ADMIN" = "USER"): Promise<string> {
  const credentials = { email: uniqueEmail(), name: "Semantic tester", password: "password123" }
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

describe("Semantic search (e2e)", () => {
  let server: TestServer
  let admin: string
  let user: string
  const http = () => request(server.url)
  const as = (token: string) => ({ Authorization: `Bearer ${token}` })
  const search = (params: Record<string, string | number>, token = user) =>
    http().get("/api/search/semantic").set(as(token)).query(params)
  const result = async (params: Record<string, string | number>) =>
    (await search(params).expect(200)).body as Result

  const ids: { rain?: string; gym?: string; bossa?: string; vnArtist?: string; krArtist?: string } =
    {}

  const createArtist = async (name: string, region: string, extra: object = {}) =>
    (
      (
        await http()
          .post("/api/artists")
          .set(as(admin))
          .send({
            name: `${TEST_NAME_PREFIX}${name}`,
            imageUrl: `${MEDIA}/a.jpg`,
            region,
            ...extra,
          })
          .expect(201)
      ).body as { id: string }
    ).id
  const createTrack = async (artistId: string, title: string, extra: object) =>
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
            ...extra,
          })
          .expect(201)
      ).body as { id: string }
    ).id
  const hasVector = async (
    table: "TrackEmbedding" | "ArtistEmbedding",
    column: string,
    id: string,
  ) =>
    (await server.db.rows(`SELECT 1 FROM "${table}" WHERE "${column}" = $1`, [id])).length > 0
      ? true
      : undefined

  beforeAll(async () => {
    server = await startTestServer({ EMBEDDING_PROVIDER: "fake" })
    admin = await register(server, "ADMIN")
    user = await register(server)

    ids.vnArtist = await createArtist("Sơn Tùng Ngữ Nghĩa", "VIETNAM", { genres: ["v-pop"] })
    ids.krArtist = await createArtist("Nhóm Hàn Ngữ Nghĩa", "KOREA", { genres: ["k-pop"] })
    ids.rain = await createTrack(ids.vnArtist, "Mưa Rơi Ngữ Nghĩa", {
      mood: ["buồn"],
      tags: ["ngày mưa"],
      description: "Nhạc buồn ngày mưa nhẹ nhàng, hợp nghe một mình.",
    })
    ids.gym = await createTrack(ids.krArtist, "Gym Beat Ngữ Nghĩa", {
      genres: ["k-pop", "dance"],
      mood: ["sôi động"],
      tags: ["tập gym"],
      description: "Nhạc tập gym K-Pop sôi động, nhịp mạnh.",
    })
    ids.bossa = await createTrack(ids.vnArtist, "Bossa Nova Chiều Muộn", {
      genres: ["jazz"],
      mood: ["thư giãn"],
      tags: ["quán cà phê"],
      description: "Bossa nova êm dịu cho quán cà phê buổi chiều.",
    })

    // The vectors are made in the background.
    for (const id of [ids.rain, ids.gym, ids.bossa]) {
      await eventually(() => hasVector("TrackEmbedding", "trackId", id))
    }
    for (const id of [ids.vnArtist, ids.krArtist]) {
      await eventually(() => hasVector("ArtistEmbedding", "artistId", id))
    }
  }, START_TIMEOUT_MS * 2)

  afterAll(async () => {
    await server.stop()
  })

  it("needs a signed-in user", async () => {
    await http().get("/api/search/semantic").query({ q: "gym" }).expect(401)
  })

  describe("what is not accepted", () => {
    it.each([
      ["no q", {}],
      ["an empty q", { q: "" }],
      ["a q of spaces only", { q: "   " }],
      ["a q of 201 characters", { q: "x".repeat(201) }],
      ["a limit of 0", { q: "gym", limit: 0 }],
      ["a limit of 21", { q: "gym", limit: 21 }],
      ["a limit that is not a number", { q: "gym", limit: "many" }],
      ["a type that does not exist", { q: "gym", type: "album" }],
      ["a region that does not exist", { q: "gym", region: "MARS" }],
    ])("answers 400 for %s", async (_name, params) => {
      await search(params as Record<string, string | number>).expect(400)
    })

    it("accepts a q of exactly 200 characters and a limit of exactly 20", async () => {
      await search({ q: "x".repeat(200), limit: 20 }).expect(200)
    })
  })

  describe("by meaning", () => {
    it("'nhạc buồn ngày mưa' finds the rainy track, whose title has none of those words", async () => {
      const { items } = await result({ q: "nhạc buồn ngày mưa" })

      expect(items[0].track?.id).toBe(ids.rain)
      expect(items[0].sources).toContain("vector")
    })

    it("'nhạc tập gym K-Pop' finds the workout track first", async () => {
      const { items } = await result({ q: "nhạc tập gym K-Pop" })

      expect(items[0].track?.id).toBe(ids.gym)
    })

    it("'quán cà phê buổi chiều' finds the bossa nova", async () => {
      expect((await result({ q: "quán cà phê buổi chiều" })).items[0].track?.id).toBe(ids.bossa)
    })

    it("is not degraded when the embedding service answers, and trims the question", async () => {
      const response = await result({ q: "  nhạc buồn ngày mưa  " })

      expect(response.degraded).toBe(false)
      expect(response.query).toBe("nhạc buồn ngày mưa")
    })

    it("a question typed without accents finds the same track", async () => {
      expect((await result({ q: "nhac buon ngay mua" })).items[0].track?.id).toBe(ids.rain)
    })
  })

  describe("by words, without accents", () => {
    it("'son tung' finds the artist when asking for artists", async () => {
      const { items, type } = await result({ q: "son tung ngu nghia", type: "artist" })

      expect(type).toBe("artist")
      expect(items[0].artist?.id).toBe(ids.vnArtist)
      expect(items[0].sources).toContain("keyword")
    })

    it("'son tung' finds that artist's tracks when asking for tracks", async () => {
      const { items } = await result({ q: "son tung ngu nghia" })
      const found = items.filter((item) => item.sources.includes("keyword")).map((i) => i.track?.id)

      expect(found).toEqual(expect.arrayContaining([ids.rain, ids.bossa]))
      expect(found).not.toContain(ids.gym)
    })

    it("a track whose title is typed is found first and by both lists", async () => {
      const { items } = await result({ q: "gym beat ngu nghia" })

      expect(items[0].track?.id).toBe(ids.gym)
      expect(items[0].sources).toEqual(expect.arrayContaining(["keyword", "vector"]))
    })
  })

  describe("the results", () => {
    it("carry a score, are ordered by it, and return full track views", async () => {
      const { items } = await result({ q: "nhạc buồn ngày mưa", limit: 5 })

      expect(items.length).toBeGreaterThan(1)
      const scores = items.map((item) => item.score)
      expect(scores).toEqual([...scores].sort((a, b) => b - a))
      expect(scores.every((score) => score > 0)).toBe(true)
      expect(items[0].track).toMatchObject({
        id: ids.rain,
        title: "Mưa Rơi Ngữ Nghĩa",
        genres: [],
        mood: ["buồn"],
        liked: false,
      })
    })

    it("give a result found by both lists a higher score than one found by a single list", async () => {
      const { items } = await result({ q: "gym beat ngu nghia" })
      const both = items.find((item) => item.sources.length === 2)
      const single = items.find((item) => item.sources.length === 1)

      expect(both).toBeDefined()
      if (both && single) expect(both.score).toBeGreaterThan(single.score)
    })

    it("respect the limit and never repeat an item", async () => {
      const { items } = await result({ q: "nhạc", limit: 2 })
      const all = (await result({ q: "nhạc", limit: 20 })).items.map((item) => item.track?.id)

      expect(items).toHaveLength(2)
      expect(new Set(all).size).toBe(all.length)
    })

    it("default to 10 results at most and to tracks", async () => {
      const response = await result({ q: "nhạc" })

      expect(response.type).toBe("track")
      expect(response.items.length).toBeLessThanOrEqual(10)
      expect(response.query).toBe("nhạc")
    })
  })

  describe("with a region", () => {
    it("only returns tracks of artists from that region", async () => {
      const kr = await result({ q: "nhạc", region: "KOREA", limit: 20 })
      const vn = await result({ q: "nhạc", region: "VIETNAM", limit: 20 })

      expect(kr.items.map((i) => i.track?.id)).toContain(ids.gym)
      expect(kr.items.map((i) => i.track?.id)).not.toContain(ids.rain)
      expect(vn.items.map((i) => i.track?.id)).not.toContain(ids.gym)
      expect(vn.items.map((i) => i.track?.id)).toEqual(expect.arrayContaining([ids.rain]))
    })

    it("works for artists too", async () => {
      const kr = await result({ q: "nhóm", type: "artist", region: "KOREA", limit: 20 })

      expect(kr.items.map((i) => i.artist?.id)).toContain(ids.krArtist)
      expect(kr.items.map((i) => i.artist?.id)).not.toContain(ids.vnArtist)
    })
  })

  it("remembers what the user liked", async () => {
    await http().put(`/api/likes/tracks/${ids.rain}`).set(as(user)).expect(200)

    const { items } = await result({ q: "nhạc buồn ngày mưa" })

    expect(items[0].track).toMatchObject({ id: ids.rain, liked: true })
  })
})

describe("Semantic search limits and switching off (e2e)", () => {
  it(
    "limits searches per user, not for everybody",
    async () => {
      const server = await startTestServer({
        EMBEDDING_PROVIDER: "fake",
        SEMANTIC_SEARCH_THROTTLE_LIMIT: "3",
        SEMANTIC_SEARCH_THROTTLE_TTL_SECONDS: "60",
      })
      try {
        const busy = await register(server)
        const quiet = await register(server)
        const ask = (token: string) =>
          request(server.url)
            .get("/api/search/semantic")
            .set("Authorization", `Bearer ${token}`)
            .query({ q: "nhạc" })

        for (let call = 0; call < 3; call += 1) await ask(busy).expect(200)
        await ask(busy).expect(429)
        await ask(quiet).expect(200)
      } finally {
        await server.stop()
      }
    },
    START_TIMEOUT_MS,
  )

  it(
    "falls back to the search by words, marked degraded, when the embedding service fails",
    async () => {
      // A provider is set but its key is refused (or the network is down): either way it fails.
      const server = await startTestServer({
        EMBEDDING_PROVIDER: "gemini",
        EMBEDDING_API_KEY: "not-a-real-key",
      })
      try {
        const token = await register(server)
        const response = await request(server.url)
          .get("/api/search/semantic")
          .set("Authorization", `Bearer ${token}`)
          .query({ q: "sơn tùng", type: "artist" })
          .expect(200)
        const body = response.body as Result

        expect(body.degraded).toBe(true)
        expect(body.items.every((item) => item.sources.join() === "keyword")).toBe(true)
      } finally {
        await server.stop()
      }
    },
    START_TIMEOUT_MS,
  )

  it(
    "answers 503 without an embedding provider, while the rest of the API keeps working",
    async () => {
      const server = await startTestServer()
      try {
        const token = await register(server)

        await request(server.url)
          .get("/api/search/semantic")
          .set("Authorization", `Bearer ${token}`)
          .query({ q: "nhạc buồn" })
          .expect(503)
        await request(server.url).get("/api/tracks?q=nhac").expect(200)
      } finally {
        await server.stop()
      }
    },
    START_TIMEOUT_MS,
  )
})
