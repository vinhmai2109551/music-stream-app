import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals"
import { HttpException, Logger } from "@nestjs/common"
import { FakeTranslator } from "./fake-translator.js"
import { TranslationService } from "./translation.service.js"
import {
  TranslatorFailure,
  type TranslatedText,
  type Translator,
  type TranslatorFailureKind,
} from "./translator.port.js"

const echo = (texts: string[]): TranslatedText[] =>
  texts.map((text) => ({ text: `KO:${text}`, billedCharacters: text.length }))

/** A translator whose answers the test decides; `translate` is a mock to look at. */
function scripted(
  translate: (texts: string[]) => Promise<TranslatedText[]> = async (texts) => echo(texts),
) {
  const translator = {
    translate: jest.fn<Translator["translate"]>((texts) => translate(texts)),
    usage: jest.fn<Translator["usage"]>(async () => ({ used: 1000, limit: 500_000 })),
  }
  return { translator, service: new TranslationService(translator) }
}

async function thrown(promise: Promise<unknown>): Promise<HttpException> {
  try {
    await promise
  } catch (error) {
    return error as HttpException
  }
  throw new Error("expected a failure")
}
const codeOf = (error: HttpException) => (error.getResponse() as { code: string }).code

let logs: jest.SpiedFunction<typeof Logger.prototype.log>[]
beforeEach(() => {
  logs = [
    jest.spyOn(Logger.prototype, "log").mockImplementation(() => undefined),
    jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined),
    jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined),
  ]
})
afterEach(() => {
  jest.restoreAllMocks()
  jest.useRealTimers()
})
const everythingLogged = () => JSON.stringify(logs.flatMap((spy) => spy.mock.calls))

describe("translating a list", () => {
  it("gives one translation per text, in the order of the texts", async () => {
    const { service } = scripted()

    const out = await service.translate(["một", "hai", "ba"], "ko")

    expect(out.texts).toEqual(["KO:một", "KO:hai", "KO:ba"])
    expect(out.billedCharacters).toBe("một".length + "hai".length + "ba".length)
  })

  it("asks for the language in the code DeepL uses", async () => {
    const { service, translator } = scripted()
    await service.translate(["x"], "zh-hans", { source: "vi" })
    expect(translator.translate).toHaveBeenCalledWith(["x"], { source: "VI", target: "ZH-HANS" })
  })

  it("lets DeepL detect the language when none is given", async () => {
    const { service, translator } = scripted()
    await service.translate(["x"], "en-US")
    expect(translator.translate).toHaveBeenCalledWith(["x"], { source: null, target: "EN-US" })
  })

  it("passes on tag handling and the tags to leave alone", async () => {
    const { service, translator } = scripted()
    await service.translate(["a <x>1</x>"], "ja", {
      source: "vi",
      tagHandling: "xml",
      ignoreTags: ["x"],
    })
    expect(translator.translate).toHaveBeenCalledWith(["a <x>1</x>"], {
      source: "VI",
      target: "JA",
      tagHandling: "xml",
      ignoreTags: ["x"],
    })
  })

  it("answers an empty list without asking anyone", async () => {
    const { service, translator } = scripted()
    expect(await service.translate([], "ko")).toEqual({ texts: [], billedCharacters: 0 })
    expect(translator.translate).not.toHaveBeenCalled()
  })

  it("does not change the list it was given", async () => {
    const { service } = scripted()
    const texts = ["a", "", "a"]
    await service.translate(texts, "ko")
    expect(texts).toEqual(["a", "", "a"])
  })
})

describe("blank texts", () => {
  it("are not sent, and keep their place", async () => {
    const { service, translator } = scripted()

    const out = await service.translate(["một", "", "  ", "\n", "hai"], "ko")

    expect(translator.translate).toHaveBeenCalledTimes(1)
    expect(translator.translate.mock.calls[0][0]).toEqual(["một", "hai"])
    expect(out.texts).toEqual(["KO:một", "", "  ", "\n", "KO:hai"])
    expect(out.texts).toHaveLength(5)
  })

  it("cost nothing when they are all there is", async () => {
    const { service, translator } = scripted()
    const out = await service.translate(["", " ", "\t"], "ko")
    expect(out).toEqual({ texts: ["", " ", "\t"], billedCharacters: 0 })
    expect(translator.translate).not.toHaveBeenCalled()
  })
})

describe("repeated texts", () => {
  it("are sent once and given back at every place they were (a chorus costs one line)", async () => {
    const { service, translator } = scripted()

    const out = await service.translate(["a", "chorus", "b", "chorus", "chorus"], "ko")

    expect(translator.translate.mock.calls[0][0]).toEqual(["a", "chorus", "b"])
    expect(out.texts).toEqual(["KO:a", "KO:chorus", "KO:b", "KO:chorus", "KO:chorus"])
    expect(out.billedCharacters).toBe("a".length + "chorus".length + "b".length)
  })

  it("are told apart by their exact text", async () => {
    const { service, translator } = scripted()
    await service.translate(["Hi", "hi", "Hi "], "ko")
    expect(translator.translate.mock.calls[0][0]).toEqual(["Hi", "hi", "Hi "])
  })
})

describe("big lists", () => {
  it("are cut into requests of at most 50 texts, in order", async () => {
    const { service, translator } = scripted()
    const texts = Array.from({ length: 120 }, (_, index) => `line ${index}`)

    const out = await service.translate(texts, "ko")

    expect(translator.translate.mock.calls.map(([batch]) => batch.length)).toEqual([50, 50, 20])
    expect(out.texts).toEqual(texts.map((text) => `KO:${text}`))
  })

  it("are cut by size too: Korean text weighs 9 bytes a character once it is sent", async () => {
    const { service, translator } = scripted()
    const line = "한".repeat(1000) // 9 006 bytes: 11 fit in 100 KiB
    const texts = Array.from({ length: 30 }, (_, index) => `${line}${index}`)

    const out = await service.translate(texts, "vi")

    const sizes = translator.translate.mock.calls.map(([batch]) => batch.length)
    expect(sizes.length).toBeGreaterThan(1)
    expect(Math.max(...sizes)).toBeLessThanOrEqual(11)
    expect(sizes.reduce((sum, size) => sum + size, 0)).toBe(30)
    expect(out.texts).toEqual(texts.map((text) => `KO:${text}`))
  })

  it("add up what every request was billed", async () => {
    const { service } = scripted()
    const texts = Array.from({ length: 60 }, (_, index) => `x${index}`)
    const out = await service.translate(texts, "ko")
    expect(out.billedCharacters).toBe(texts.reduce((sum, text) => sum + text.length, 0))
  })

  it("refuse a text that cannot go in any request, before spending anything", async () => {
    const { service, translator } = scripted()
    const error = await thrown(service.translate(["ok", "x".repeat(200_000)], "ko"))

    expect(error.getStatus()).toBe(400)
    expect(codeOf(error)).toBe("TRANSLATION_TEXT_TOO_LARGE")
    expect(translator.translate).not.toHaveBeenCalled()
  })

  it("stop at the first request that fails (and say what happened)", async () => {
    let calls = 0
    const { service, translator } = scripted(async (texts) => {
      calls += 1
      if (calls === 2) throw new TranslatorFailure("unavailable", 503)
      return echo(texts)
    })

    const error = await thrown(
      service.translate(
        Array.from({ length: 120 }, (_, index) => `l${index}`),
        "ko",
      ),
    )

    expect(codeOf(error)).toBe("TRANSLATION_UNAVAILABLE")
    expect(translator.translate).toHaveBeenCalledTimes(2)
  })
})

describe("the languages", () => {
  it.each(["en", "pt", "zh", "xx", "", "vi-VN", "en-GB"])(
    "refuse the target %p",
    async (target) => {
      const { service, translator } = scripted()
      const error = await thrown(service.translate(["x"], target))

      expect(error.getStatus()).toBe(400)
      expect(codeOf(error)).toBe("TRANSLATION_LANGUAGE_NOT_SUPPORTED")
      expect(translator.translate).not.toHaveBeenCalled()
    },
  )

  it("list the valid ones in the message", async () => {
    const { service } = scripted()
    const error = await thrown(service.translate(["x"], "de"))
    expect(error.message).toContain("vi, en-US, ko, ja, zh-Hans")
  })

  it("refuse a source it does not know, but accept none", async () => {
    const { service } = scripted()
    const error = await thrown(service.translate(["x"], "ko", { source: "de" }))
    expect(codeOf(error)).toBe("TRANSLATION_LANGUAGE_NOT_SUPPORTED")
    await expect(service.translate(["x"], "ko", { source: null })).resolves.toBeDefined()
    await expect(service.translate(["x"], "ko", { source: undefined })).resolves.toBeDefined()
  })

  it("give the texts back, and spend nothing, when they already are in that language", async () => {
    const { service, translator } = scripted()

    const out = await service.translate(["xin chào", "tạm biệt"], "VI", { source: "vi" })

    expect(out).toEqual({ texts: ["xin chào", "tạm biệt"], billedCharacters: 0 })
    expect(translator.translate).not.toHaveBeenCalled()
  })

  it("expose the languages that may be translated to", () => {
    const { service } = scripted()
    expect([...service.languages]).toEqual(["vi", "en-US", "ko", "ja", "zh-Hans"])
  })
})

describe("without a key", () => {
  const service = new TranslationService(null)

  it("loads, and says it is not configured", () => {
    expect(service.isConfigured()).toBe(false)
  })

  it("answers 503 TRANSLATION_NOT_CONFIGURED, even when there is nothing to translate", async () => {
    for (const texts of [["x"], [], [""]]) {
      const error = await thrown(service.translate(texts, "ko"))
      expect(error.getStatus()).toBe(503)
      expect(codeOf(error)).toBe("TRANSLATION_NOT_CONFIGURED")
    }
  })

  it("still refuses a language it does not know first (a plain 400)", async () => {
    const error = await thrown(service.translate(["x"], "de"))
    expect(error.getStatus()).toBe(400)
  })

  it("reports an usage that is not configured", async () => {
    expect(await service.usage()).toEqual({
      configured: false,
      used: null,
      limit: null,
      percent: null,
      warning: false,
    })
  })
})

describe("when DeepL fails", () => {
  const failWith = (kind: TranslatorFailureKind, status?: number) =>
    scripted(async () => {
      throw new TranslatorFailure(kind, status)
    })

  it.each([
    ["rate-limited", 429, 503, "TRANSLATION_BUSY"],
    ["unavailable", 503, 503, "TRANSLATION_UNAVAILABLE"],
    ["unavailable", undefined, 503, "TRANSLATION_UNAVAILABLE"],
    ["bad-request", 400, 400, "TRANSLATION_REJECTED"],
    ["auth", 403, 503, "TRANSLATION_NOT_CONFIGURED"],
    ["quota", 456, 503, "TRANSLATION_QUOTA_EXCEEDED"],
  ] as const)("%s (%p) becomes %d %s", async (kind, status, httpStatus, code) => {
    const { service } = failWith(kind, status)
    const error = await thrown(service.translate(["x"], "ko"))
    expect(error.getStatus()).toBe(httpStatus)
    expect(codeOf(error)).toBe(code)
  })

  it("does not retry by itself: the SDK has already retried what could be retried", async () => {
    const { service, translator } = failWith("rate-limited", 429)
    await thrown(service.translate(["x"], "ko"))
    expect(translator.translate).toHaveBeenCalledTimes(1)
  })

  it("treats an error it does not know as a service that is not available", async () => {
    const { service } = scripted(async () => {
      throw new Error("boom")
    })
    expect(codeOf(await thrown(service.translate(["x"], "ko")))).toBe("TRANSLATION_UNAVAILABLE")
  })

  it("does not trust an answer with the wrong number of translations", async () => {
    const { service } = scripted(async () => [{ text: "only one", billedCharacters: 1 }])
    const error = await thrown(service.translate(["a", "b"], "ko"))
    expect(codeOf(error)).toBe("TRANSLATION_UNAVAILABLE")
  })

  it("has a friendly message, in Vietnamese, for the person", async () => {
    const { service } = failWith("quota", 456)
    const error = await thrown(service.translate(["x"], "ko"))
    expect((error.getResponse() as { message: string }).message).toMatch(/hạn mức/)
  })
})

describe("when the allowance is used up (456)", () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date("2026-11-09T10:00:00Z"))
  })

  it("is not asked again for a while", async () => {
    let quota = true
    const { service, translator } = scripted(async (texts) => {
      if (quota) throw new TranslatorFailure("quota", 456)
      return echo(texts)
    })

    await thrown(service.translate(["x"], "ko"))
    expect(translator.translate).toHaveBeenCalledTimes(1)

    jest.advanceTimersByTime(14 * 60 * 1000)
    quota = false // it would work now, but nobody asks
    const error = await thrown(service.translate(["x"], "ko"))
    expect(codeOf(error)).toBe("TRANSLATION_QUOTA_EXCEEDED")
    expect(translator.translate).toHaveBeenCalledTimes(1)
  })

  it("is asked again after fifteen minutes", async () => {
    let quota = true
    const { service, translator } = scripted(async (texts) => {
      if (quota) throw new TranslatorFailure("quota", 456)
      return echo(texts)
    })
    await thrown(service.translate(["x"], "ko"))

    jest.advanceTimersByTime(15 * 60 * 1000 + 1)
    quota = false

    await expect(service.translate(["x"], "ko")).resolves.toMatchObject({ texts: ["KO:x"] })
    expect(translator.translate).toHaveBeenCalledTimes(2)
  })

  it("still gives back what needs no translation", async () => {
    const { service } = scripted(async () => {
      throw new TranslatorFailure("quota", 456)
    })
    await thrown(service.translate(["x"], "ko"))

    await expect(service.translate(["a b"], "vi", { source: "vi" })).resolves.toMatchObject({
      texts: ["a b"],
    })
    await expect(service.translate(["", " "], "ko")).resolves.toMatchObject({ billedCharacters: 0 })
  })
})

describe("at most two requests are on their way at once", () => {
  it("makes the others wait", async () => {
    let running = 0
    let most = 0
    const releases: (() => void)[] = []
    const { service } = scripted(async (texts) => {
      running += 1
      most = Math.max(most, running)
      await new Promise<void>((resolve) => releases.push(resolve))
      running -= 1
      return echo(texts)
    })

    const calls = [0, 1, 2, 3].map((n) => service.translate([`t${n}`], "ko"))
    await new Promise((resolve) => setImmediate(resolve))
    expect(running).toBe(2)
    while (releases.length > 0 || running > 0) {
      releases.shift()?.()
      await new Promise((resolve) => setImmediate(resolve))
    }
    await Promise.all(calls)

    expect(most).toBe(2)
  })
})

describe("logs", () => {
  it("never contain a text, a translation or a key", async () => {
    const lyric = "a line of a song that must never reach a log"
    const { service } = scripted()
    await service.translate([lyric, "another secret line"], "ko")
    const failing = scripted(async () => {
      throw new TranslatorFailure("bad-request", 400)
    })
    await thrown(failing.service.translate([lyric], "ko"))
    const unavailable = scripted(async () => {
      throw new TranslatorFailure("unavailable", 503)
    })
    await thrown(unavailable.service.translate([lyric], "ko"))
    const auth = scripted(async () => {
      throw new TranslatorFailure("auth", 403)
    })
    await thrown(auth.service.translate([lyric], "ko"))

    const written = everythingLogged()
    expect(written).not.toContain("a line of a song")
    expect(written).not.toContain("secret line")
    expect(written).not.toContain("KO:")
    expect(written).toContain("2 texts")
    expect(written).toContain("characters billed")
  })

  it("name the key setting when DeepL refuses the key, without printing any key", async () => {
    const { service } = scripted(async () => {
      throw new TranslatorFailure("auth", 403)
    })
    await thrown(service.translate(["x"], "ko"))
    expect(everythingLogged()).toContain("DEEPL_API_KEY")
  })
})

describe("usage", () => {
  it("is read from DeepL for an administrator", async () => {
    const { service, translator } = scripted()
    expect(await service.usage()).toEqual({
      configured: true,
      used: 1000,
      limit: 500_000,
      percent: 0.2,
      warning: false,
    })
    expect(translator.usage).toHaveBeenCalled()
  })

  it("warns in the log from 80% of the allowance on", async () => {
    const { service, translator } = scripted()
    translator.usage.mockResolvedValue({ used: 450_000, limit: 500_000 })
    const usage = await service.usage()

    expect(usage).toMatchObject({ percent: 90, warning: true })
    expect(everythingLogged()).toContain("90%")
  })

  it("becomes a 503 when DeepL cannot be reached", async () => {
    const { service, translator } = scripted()
    translator.usage.mockRejectedValue(new TranslatorFailure("unavailable"))
    expect(codeOf(await thrown(service.usage()))).toBe("TRANSLATION_UNAVAILABLE")
  })

  it("counts what a translation was billed, and checks DeepL after the first one", async () => {
    const { service, translator } = scripted()
    await service.translate(["abcdef"], "ko")
    await new Promise((resolve) => setImmediate(resolve))
    expect(translator.usage).toHaveBeenCalledTimes(1)
  })
})

describe("with the fake translator", () => {
  it("works end to end, with no network", async () => {
    const fake = new FakeTranslator()
    const service = new TranslationService(fake)

    const out = await service.translate(["xin chào", "", "xin chào", "tạm biệt"], "ja")

    expect(out.texts).toEqual(["[JA] xin chào", "", "[JA] xin chào", "[JA] tạm biệt"])
    expect(fake.requests).toHaveLength(1)
    expect(fake.requests[0].texts).toEqual(["xin chào", "tạm biệt"])
    expect(out.billedCharacters).toBe("xin chào".length + "tạm biệt".length)
  })
})
