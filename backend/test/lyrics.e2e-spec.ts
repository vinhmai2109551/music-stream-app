import { afterAll, beforeAll, describe, expect, it } from "@jest/globals"
import request from "supertest"
import {
  startTestServer,
  TEST_NAME_PREFIX,
  uniqueEmail,
  type TestServer,
} from "./helpers/test-server.js"

const IMAGE_URL = "https://media.e2e.test/covers/e2e.jpg"
const LINES = ["Dòng một", "", "Dòng hai", "Dòng ba"]

interface ErrorBody {
  code?: string
  message?: string
}
interface LyricsBody {
  trackId: string
  language: string
  lines: string[]
  timingsMs: number[] | null
  source: string
}
interface TranslationBody {
  sourceLanguage: string
  targetLanguage: string
  lines: string[]
  provider: string
  cached: boolean
  translatedAt: string | null
}

async function account(server: TestServer, role: "USER" | "ADMIN") {
  const credentials = { email: uniqueEmail(), name: `Lyrics ${role}`, password: "password123" }
  await request(server.url).post("/api/auth/register").send(credentials).expect(201)
  if (role === "ADMIN") {
    await server.db.run(`UPDATE "User" SET role = 'ADMIN' WHERE email = $1`, [credentials.email])
  }
  const login = await request(server.url)
    .post("/api/auth/login")
    .send({ email: credentials.email, password: credentials.password })
    .expect(200)
  return { Authorization: `Bearer ${(login.body as { accessToken: string }).accessToken}` }
}

/** A track to attach lyrics to (removed with its artist after the run). */
async function createTrack(server: TestServer, auth: { Authorization: string }, name: string) {
  const artist = await request(server.url)
    .post("/api/artists")
    .set(auth)
    .send({ name: `${TEST_NAME_PREFIX}${name} Artist`, imageUrl: IMAGE_URL })
    .expect(201)
  const track = await request(server.url)
    .post("/api/tracks")
    .set(auth)
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

const translationRows = (server: TestServer, trackId: string) =>
  server.db.rows<{ targetLanguage: string }>(
    `SELECT t."targetLanguage" FROM "TrackLyricsTranslation" t
       JOIN "TrackLyrics" l ON l.id = t."lyricsId" WHERE l."trackId" = $1`,
    [trackId],
  )

describe("Lyrics (e2e) with the fake translator", () => {
  let server: TestServer
  let admin: { Authorization: string }
  let user: { Authorization: string }
  let trackId: string
  let bareTrackId: string

  beforeAll(async () => {
    server = await startTestServer({ TRANSLATION_PROVIDER: "fake" })
    admin = await account(server, "ADMIN")
    user = await account(server, "USER")
    trackId = await createTrack(server, admin, "Lyrics song")
    bareTrackId = await createTrack(server, admin, "Lyrics bare")
  })
  afterAll(async () => {
    await server.stop()
  })

  const lyricsUrl = (id: string) => `/api/tracks/${id}/lyrics`
  const translateUrl = (id: string, lang: string) => `${lyricsUrl(id)}/translation?lang=${lang}`

  describe("the original lyrics", () => {
    it("need a login", async () => {
      await request(server.url).get(lyricsUrl(trackId)).expect(401)
      await request(server.url).get(translateUrl(trackId, "ko")).expect(401)
    })

    it("say clearly that a track has none (404 LYRICS_NOT_FOUND, not a 500)", async () => {
      const response = await request(server.url).get(lyricsUrl(bareTrackId)).set(user).expect(404)
      expect((response.body as ErrorBody).code).toBe("LYRICS_NOT_FOUND")
    })

    it("answer 404 for a track that does not exist", async () => {
      const response = await request(server.url)
        .get(lyricsUrl("no-such-track"))
        .set(user)
        .expect(404)
      expect((response.body as ErrorBody).code).toBeUndefined()
      await request(server.url).get(translateUrl("no-such-track", "ko")).set(user).expect(404)
    })

    it("are written by an administrator only", async () => {
      const body = { language: "vi", lines: LINES, source: "demo" }
      await request(server.url).put(lyricsUrl(trackId)).send(body).expect(401)
      await request(server.url).put(lyricsUrl(trackId)).set(user).send(body).expect(403)
    })

    it("refuse empty text, an unknown language, timings that do not fit and a missing source", async () => {
      const put = (body: object) =>
        request(server.url).put(lyricsUrl(trackId)).set(admin).send(body)
      await put({ language: "vi", lines: ["", " "], source: "demo" }).expect(400)
      await put({ language: "fr", lines: LINES, source: "demo" }).expect(400)
      await put({ language: "vi", lines: LINES, timingsMs: [0, 1], source: "demo" }).expect(400)
      await put({ language: "vi", lines: LINES }).expect(400)
      await put({ language: "vi", lines: "not a list", source: "demo" }).expect(400)
      await request(server.url)
        .put(lyricsUrl("no-such-track"))
        .set(admin)
        .send({ language: "vi", lines: LINES, source: "demo" })
        .expect(404)
    })

    it("are kept as written, blank line included, and read back", async () => {
      const put = await request(server.url)
        .put(lyricsUrl(trackId))
        .set(admin)
        .send({ language: "vi", lines: LINES, timingsMs: [0, 1000, 2000, 3000], source: "demo" })
        .expect(200)
      expect((put.body as LyricsBody).lines).toEqual(LINES)

      const get = await request(server.url).get(lyricsUrl(trackId)).set(user).expect(200)
      expect(get.body).toMatchObject({
        trackId,
        language: "vi",
        lines: LINES,
        timingsMs: [0, 1000, 2000, 3000],
        source: "demo",
      })
    })

    it("are not in the track view", async () => {
      const response = await request(server.url).get(`/api/tracks/${trackId}`).expect(200)
      expect(JSON.stringify(response.body)).not.toContain("Dòng hai")
    })
  })

  describe("the translation", () => {
    it("has one line for every line, with the blank one in place", async () => {
      const response = await request(server.url)
        .get(translateUrl(trackId, "ko"))
        .set(user)
        .expect(200)
      const body = response.body as TranslationBody

      expect(body).toMatchObject({
        sourceLanguage: "vi",
        targetLanguage: "ko",
        provider: "deepl",
        cached: false,
      })
      expect(body.lines).toHaveLength(LINES.length)
      expect(body.lines[1]).toBe("")
      expect(body.lines[0]).toContain("Dòng một")
      expect(body.translatedAt).not.toBeNull()
    })

    it("is kept: asking again reads it from the database", async () => {
      const again = await request(server.url).get(translateUrl(trackId, "ko")).set(user).expect(200)
      expect((again.body as TranslationBody).cached).toBe(true)
      expect(await translationRows(server, trackId)).toHaveLength(1)
    })

    it("is made once when many requests come at the same moment", async () => {
      const responses = await Promise.all(
        Array.from({ length: 8 }, () =>
          request(server.url).get(translateUrl(trackId, "ja")).set(user),
        ),
      )

      expect(responses.map((response) => response.status)).toEqual(Array(8).fill(200))
      const bodies = responses.map((response) => response.body as TranslationBody)
      expect(new Set(bodies.map((body) => body.lines.join("|"))).size).toBe(1)
      const rows = await translationRows(server, trackId)
      expect(rows.filter((row) => row.targetLanguage === "ja")).toHaveLength(1)
    })

    it("is not needed when the lyrics are already in that language", async () => {
      const before = (await translationRows(server, trackId)).length

      const response = await request(server.url)
        .get(translateUrl(trackId, "VI"))
        .set(user)
        .expect(200)

      expect(response.body).toMatchObject({
        provider: "original",
        cached: true,
        translatedAt: null,
      })
      expect((response.body as TranslationBody).lines).toEqual(LINES)
      expect(await translationRows(server, trackId)).toHaveLength(before)
    })

    it("answers 400 for a language the app does not have, and for none", async () => {
      const response = await request(server.url)
        .get(translateUrl(trackId, "fr"))
        .set(user)
        .expect(400)
      expect((response.body as ErrorBody).code).toBe("LYRICS_LANGUAGE_NOT_SUPPORTED")
      await request(server.url)
        .get(lyricsUrl(trackId) + "/translation")
        .set(user)
        .expect(400)
    })

    it("answers 404 LYRICS_NOT_FOUND for a track without lyrics", async () => {
      const response = await request(server.url)
        .get(translateUrl(bareTrackId, "ko"))
        .set(user)
        .expect(404)
      expect((response.body as ErrorBody).code).toBe("LYRICS_NOT_FOUND")
    })

    it("is made again, and the old one is gone, when the lyrics change", async () => {
      await request(server.url)
        .put(lyricsUrl(trackId))
        .set(admin)
        .send({ language: "vi", lines: ["Lời mới", "", "hơn"], source: "manual" })
        .expect(200)
      expect(await translationRows(server, trackId)).toHaveLength(0)

      const response = await request(server.url)
        .get(translateUrl(trackId, "ko"))
        .set(user)
        .expect(200)

      expect((response.body as TranslationBody).lines).toEqual(["[KO] Lời mới", "", "[KO] hơn"])
      expect((response.body as TranslationBody).cached).toBe(false)
    })
  })
})

describe("Lyrics (e2e) without a DeepL key", () => {
  let server: TestServer
  let auth: { Authorization: string }
  let trackId: string

  beforeAll(async () => {
    server = await startTestServer() // the test environment blanks DEEPL_API_KEY
    auth = await account(server, "ADMIN")
    trackId = await createTrack(server, auth, "Lyrics no key")
    await request(server.url)
      .put(`/api/tracks/${trackId}/lyrics`)
      .set(auth)
      .send({ language: "vi", lines: LINES, source: "demo" })
      .expect(200)
  })
  afterAll(async () => {
    await server.stop()
  })

  it("still shows the original lyrics and lyrics in the language asked for", async () => {
    await request(server.url).get(`/api/tracks/${trackId}/lyrics`).set(auth).expect(200)
    const same = await request(server.url)
      .get(`/api/tracks/${trackId}/lyrics/translation?lang=vi`)
      .set(auth)
      .expect(200)
    expect((same.body as TranslationBody).provider).toBe("original")
  })

  it("answers 503 TRANSLATION_NOT_CONFIGURED for a translation, and nothing is kept", async () => {
    const response = await request(server.url)
      .get(`/api/tracks/${trackId}/lyrics/translation?lang=ko`)
      .set(auth)
      .expect(503)
    expect((response.body as ErrorBody).code).toBe("TRANSLATION_NOT_CONFIGURED")
    expect(await translationRows(server, trackId)).toHaveLength(0)
  })
})

describe("Lyrics (e2e) rate limit", () => {
  let server: TestServer
  let admin: { Authorization: string }
  let trackId: string

  beforeAll(async () => {
    server = await startTestServer({
      TRANSLATION_PROVIDER: "fake",
      LYRICS_TRANSLATE_THROTTLE_LIMIT: "2",
      LYRICS_TRANSLATE_THROTTLE_TTL_SECONDS: "60",
    })
    admin = await account(server, "ADMIN")
    trackId = await createTrack(server, admin, "Lyrics throttle")
    await request(server.url)
      .put(`/api/tracks/${trackId}/lyrics`)
      .set(admin)
      .send({ language: "vi", lines: LINES, source: "demo" })
      .expect(200)
  })
  afterAll(async () => {
    await server.stop()
  })

  it("is per user: the third request of one user is refused, another user is not", async () => {
    const heavy = await account(server, "USER")
    const other = await account(server, "USER")
    const ask = (auth: { Authorization: string }) =>
      request(server.url).get(`/api/tracks/${trackId}/lyrics/translation?lang=ko`).set(auth)

    await ask(heavy).expect(200)
    await ask(heavy).expect(200)
    await ask(heavy).expect(429)
    await ask(other).expect(200)
  })
})
