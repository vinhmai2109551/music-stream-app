import { describe, expect, it } from "@jest/globals"
import { ServiceUnavailableException } from "@nestjs/common"
import { LyricsTranslationService } from "./lyrics-translation.service.js"
import { LyricsService } from "./lyrics.service.js"
import {
  FakeLyricsTranslator,
  FakeTrackDirectory,
  InMemoryLyricsStore,
  LANGUAGES,
  SETTINGS,
} from "./testing/fakes.js"

const LINES = ["một", "", "hai", "hai", "ba"]

async function setup() {
  const store = new InMemoryLyricsStore()
  const translator = new FakeLyricsTranslator()
  const lyrics = new LyricsService(
    store,
    { fetch: async () => null },
    new FakeTrackDirectory({
      t1: { title: "Bài demo", artist: "Nghệ sĩ demo" },
      t2: { title: "Chưa có lời", artist: "Nghệ sĩ demo" },
    }),
    LANGUAGES,
  )
  const service = new LyricsTranslationService(store, translator, SETTINGS, LANGUAGES, lyrics)
  await lyrics.put("t1", { language: "vi", lines: LINES, source: "demo" })
  return { store, translator, lyrics, service }
}

const code = (error: unknown) => (error as { getResponse(): { code?: string } }).getResponse().code

describe("translating lyrics", () => {
  it("gives one line for every line, the blank one in its place", async () => {
    const { service } = await setup()

    const result = await service.translate("t1", "ko")

    expect(result).toMatchObject({
      trackId: "t1",
      sourceLanguage: "vi",
      targetLanguage: "ko",
      provider: "deepl",
      cached: false,
    })
    expect(result.lines).toEqual(["[ko] một", "", "[ko] hai", "[ko] hai", "[ko] ba"])
    expect(result.lines).toHaveLength(LINES.length)
    expect(result.translatedAt).not.toBeNull()
  })

  it("tells the engine the language of the lyrics", async () => {
    const { service, translator } = await setup()
    await service.translate("t1", "ja")
    expect(translator.calls).toEqual([{ lines: LINES, target: "ja", source: "vi" }])
  })

  it("accepts the language in any case", async () => {
    const { service } = await setup()
    expect((await service.translate("t1", "EN-us")).targetLanguage).toBe("en-US")
  })

  it("keeps the translation, and a second request does not call the engine", async () => {
    const { service, translator, store } = await setup()
    const first = await service.translate("t1", "ko")

    const second = await service.translate("t1", "ko")

    expect(translator.calls).toHaveLength(1)
    expect(store.translations).toHaveLength(1)
    expect(second.cached).toBe(true)
    expect(second.lines).toEqual(first.lines)
    expect(second.translatedAt).toBe(first.translatedAt)
  })

  it("translates each language once", async () => {
    const { service, translator } = await setup()
    await service.translate("t1", "ko")
    await service.translate("t1", "ja")
    await service.translate("t1", "ko")
    expect(translator.calls.map((call) => call.target)).toEqual(["ko", "ja"])
  })

  it("makes one call when many requests come at the same moment", async () => {
    const { service, translator, store } = await setup()
    translator.delayMs = 20

    const results = await Promise.all(
      Array.from({ length: 6 }, () => service.translate("t1", "ko")),
    )

    expect(translator.calls).toHaveLength(1)
    expect(store.translations).toHaveLength(1)
    expect(new Set(results.map((result) => result.lines.join("|"))).size).toBe(1)
    expect(results.filter((result) => !result.cached)).toHaveLength(1)
  })

  it("stores one row even when two servers both made the translation", async () => {
    const { service, translator, store, lyrics } = await setup()
    const other = new LyricsTranslationService(store, translator, SETTINGS, LANGUAGES, lyrics)
    translator.delayMs = 20

    const [a, b] = await Promise.all([service.translate("t1", "ko"), other.translate("t1", "ko")])

    expect(translator.calls).toHaveLength(2) // nothing shared between the two services
    expect(store.translations).toHaveLength(1)
    expect(a.lines).toEqual(b.lines)
  })

  it("starts again after a failure", async () => {
    const { service, translator } = await setup()
    translator.failWith = new ServiceUnavailableException("down")
    await expect(service.translate("t1", "ko")).rejects.toThrow("down")

    translator.failWith = null
    const result = await service.translate("t1", "ko")

    expect(result.cached).toBe(false)
    expect(translator.calls).toHaveLength(2)
  })
})

describe("lyrics already in the language asked for", () => {
  it("come back as they are, with nothing sent and nothing checked", async () => {
    const { service, translator, store } = await setup()

    const result = await service.translate("t1", "vi")

    expect(result).toMatchObject({ provider: "original", cached: true, translatedAt: null })
    expect(result.lines).toEqual(LINES)
    expect(translator.calls).toHaveLength(0)
    expect(translator.guards).toHaveLength(0)
    expect(store.translations).toHaveLength(0)
  })
})

describe("what stops a translation", () => {
  it("answers 400 for a language the app does not have, naming the ones it has", async () => {
    const { service, translator } = await setup()
    const error = await service.translate("t1", "fr").catch((e) => e)
    expect(error.getStatus()).toBe(400)
    expect(code(error)).toBe("LYRICS_LANGUAGE_NOT_SUPPORTED")
    expect(error.getResponse().message).toContain("zh-Hans")
    expect(translator.calls).toHaveLength(0)
  })

  it("answers 404 for a track without lyrics and for a track that does not exist", async () => {
    const { service } = await setup()
    expect(code(await service.translate("t2", "ko").catch((e) => e))).toBe("LYRICS_NOT_FOUND")
    await expect(service.translate("nope", "ko")).rejects.toThrow("Track not found")
  })

  it("does not start a translation when the allowance is nearly used up", async () => {
    const { service, translator } = await setup()
    translator.guard = async () => {
      throw new ServiceUnavailableException({ code: "TRANSLATION_QUOTA_EXCEEDED" })
    }

    const error = await service.translate("t1", "ko").catch((e) => e)

    expect(code(error)).toBe("TRANSLATION_QUOTA_EXCEEDED")
    expect(translator.guards).toEqual([90])
    expect(translator.calls).toHaveLength(0)
  })

  it("still serves a kept translation when the allowance is nearly used up", async () => {
    const { service, translator } = await setup()
    await service.translate("t1", "ko")
    translator.guard = async () => {
      throw new ServiceUnavailableException({ code: "TRANSLATION_QUOTA_EXCEEDED" })
    }

    const again = await service.translate("t1", "ko")

    expect(again.cached).toBe(true)
  })

  it("keeps nothing when the engine returns a different number of lines", async () => {
    const { service, translator, store } = await setup()
    translator.dropLastLine = true

    const error = await service.translate("t1", "ko").catch((e) => e)

    expect(code(error)).toBe("LYRICS_TRANSLATION_FAILED")
    expect(store.translations).toHaveLength(0)
  })
})

describe("lyrics that change", () => {
  it("are translated again, and the old translation is gone", async () => {
    const { service, translator, lyrics, store } = await setup()
    await service.translate("t1", "ko")

    await lyrics.put("t1", { language: "vi", lines: ["mới", "hơn"], source: "demo" })
    const result = await service.translate("t1", "ko")

    expect(result.lines).toEqual(["[ko] mới", "[ko] hơn"])
    expect(translator.calls).toHaveLength(2)
    expect(store.translations).toHaveLength(1)
  })
})
