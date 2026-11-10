import { describe, expect, it, jest } from "@jest/globals"
import { LyricsService } from "./lyrics.service.js"
import { lyricsContentHash } from "./lyrics-text.js"
import type { LyricsSource, SourcedLyrics } from "./ports.js"
import { FakeTrackDirectory, InMemoryLyricsStore, LANGUAGES } from "./testing/fakes.js"

const TRACKS = { t1: { title: "Bài demo", artist: "Nghệ sĩ demo" } }
const INPUT = { language: "vi", lines: ["một", "", "hai"], source: "demo" }

function setup(source: LyricsSource = { fetch: async () => null }) {
  const store = new InMemoryLyricsStore()
  const service = new LyricsService(store, source, new FakeTrackDirectory(TRACKS), LANGUAGES)
  return { store, service }
}

const code = (error: unknown) => (error as { getResponse(): { code?: string } }).getResponse().code

describe("LyricsService.put and get", () => {
  it("keeps the lines, the blank line in between and the version of the text", async () => {
    const { service, store } = setup()

    const written = await service.put("t1", INPUT)

    expect(written).toMatchObject({
      trackId: "t1",
      language: "vi",
      source: "demo",
      timingsMs: null,
    })
    expect(written.lines).toEqual(["một", "", "hai"])
    expect((await service.get("t1")).lines).toEqual(["một", "", "hai"])
    expect(store.lyrics.get("t1")?.contentHash).toBe(lyricsContentHash("vi", ["một", "", "hai"]))
  })

  it("keeps the timings when there is one for every line", async () => {
    const { service } = setup()
    const written = await service.put("t1", { ...INPUT, timingsMs: [0, 1000, 2000] })
    expect(written.timingsMs).toEqual([0, 1000, 2000])
  })

  it("refuses timings that do not match the lines", async () => {
    const { service } = setup()
    const error = await service.put("t1", { ...INPUT, timingsMs: [0, 1000] }).catch((e) => e)
    expect(code(error)).toBe("LYRICS_INVALID")
  })

  it.each([
    ["nothing but blank lines", { ...INPUT, lines: ["", "  "] }],
    ["a language the app does not have", { ...INPUT, language: "fr" }],
    ["too many lines", { ...INPUT, lines: Array.from({ length: 501 }, () => "a") }],
    ["a line that is too long", { ...INPUT, lines: ["a".repeat(501)] }],
    ["too many characters", { ...INPUT, lines: Array.from({ length: 41 }, () => "a".repeat(500)) }],
  ])("refuses %s", async (_name, input) => {
    const { service } = setup()
    const error = await service.put("t1", input).catch((e) => e)
    expect(code(error)).toBe("LYRICS_INVALID")
  })

  it("answers 404 for a track that does not exist, without writing", async () => {
    const { service, store } = setup()
    await expect(service.put("nope", INPUT)).rejects.toThrow("Track not found")
    expect(store.lyrics.size).toBe(0)
  })

  it("says clearly that a track has no lyrics", async () => {
    const { service } = setup()
    const error = await service.get("t1").catch((e) => e)
    expect(error.getStatus()).toBe(404)
    expect(code(error)).toBe("LYRICS_NOT_FOUND")
  })

  it("answers 404 for a track that does not exist", async () => {
    const { service } = setup()
    await expect(service.get("nope")).rejects.toThrow("Track not found")
  })

  it("deletes the translations of an older text when the lyrics are replaced", async () => {
    const { service, store } = setup()
    await service.put("t1", INPUT)
    const stored = store.lyrics.get("t1")!
    await store.saveTranslation({
      lyricsId: stored.id,
      targetLanguage: "ko",
      sourceHash: stored.contentHash,
      lines: ["x"],
      provider: "deepl",
      billedCharacters: 1,
    })

    await service.put("t1", { ...INPUT, lines: ["khác"] })

    expect(store.translations).toHaveLength(0)
  })

  it("keeps a translation when the same text is written again", async () => {
    const { service, store } = setup()
    await service.put("t1", INPUT)
    const stored = store.lyrics.get("t1")!
    await store.saveTranslation({
      lyricsId: stored.id,
      targetLanguage: "ko",
      sourceHash: stored.contentHash,
      lines: ["x"],
      provider: "deepl",
      billedCharacters: 1,
    })

    await service.put("t1", INPUT)

    expect(store.translations).toHaveLength(1)
  })
})

describe("a connected lyrics source", () => {
  const found: SourcedLyrics = { language: "ko", lines: ["가", "나"], source: "Acme Lyrics" }

  it("is asked for a track that has no lyrics yet, and what it finds is kept", async () => {
    const fetch = jest.fn<LyricsSource["fetch"]>(async () => found)
    const { service, store } = setup({ fetch })

    const view = await service.get("t1")

    expect(fetch).toHaveBeenCalledWith({ trackId: "t1", title: "Bài demo", artist: "Nghệ sĩ demo" })
    expect(view).toMatchObject({ language: "ko", source: "Acme Lyrics", lines: ["가", "나"] })
    expect(store.lyrics.has("t1")).toBe(true)

    await service.get("t1")
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it("is not asked when the lyrics are there", async () => {
    const fetch = jest.fn<LyricsSource["fetch"]>(async () => found)
    const { service } = setup({ fetch })
    await service.put("t1", INPUT)

    await service.get("t1")

    expect(fetch).not.toHaveBeenCalled()
  })
})

describe("LyricsService.statusOf", () => {
  it("tells apart tracks with timed lyrics, plain lyrics and none, without asking a source", async () => {
    const fetch = jest.fn<LyricsSource["fetch"]>(async () => null)
    const { service } = setup({ fetch })
    await service.put("t1", { ...INPUT, timingsMs: [0, 1000, 2000] })

    const status = await service.statusOf(["t1", "t2"])

    expect(status.get("t1")).toEqual({ hasLyrics: true, hasTimings: true })
    expect(status.has("t2")).toBe(false)
    expect(fetch).not.toHaveBeenCalled()
  })

  it("says plain lyrics have no timings", async () => {
    const { service } = setup()
    await service.put("t1", INPUT)

    expect((await service.statusOf(["t1"])).get("t1")).toEqual({
      hasLyrics: true,
      hasTimings: false,
    })
  })
})
