import { describe, expect, it, jest } from "@jest/globals"
import { ApiError } from "@/api/client"
import { cachedLoad, clearLyricsCache } from "@/utils/lyricsCache"
import { canRetry, lyricsFailure } from "@/utils/lyricsErrors"

const http = (status: number, code?: string) =>
  new ApiError({ status, kind: "http", message: "x", details: code ? { code } : undefined })

describe("lyricsFailure", () => {
  it.each([
    [http(404, "LYRICS_NOT_FOUND"), "none"],
    [http(404), "none"],
    [http(429), "rate-limited"],
    [http(503, "TRANSLATION_QUOTA_EXCEEDED"), "quota"],
    [http(503, "TRANSLATION_NOT_CONFIGURED"), "not-configured"],
    [http(503, "TRANSLATION_BUSY"), "busy"],
    [http(503, "LYRICS_TRANSLATION_FAILED"), "busy"],
    [http(503), "busy"],
    [http(400, "LYRICS_LANGUAGE_NOT_SUPPORTED"), "generic"],
    [http(500), "generic"],
    [new ApiError({ status: 0, kind: "network", message: "x" }), "offline"],
    [new ApiError({ status: 0, kind: "timeout", message: "x" }), "offline"],
    [new Error("boom"), "generic"],
  ])("%#: %s", (error, expected) => {
    expect(lyricsFailure(error)).toBe(expected)
  })

  it("does not offer a retry for a limit that stays", () => {
    expect(canRetry("quota")).toBe(false)
    expect(canRetry("not-configured")).toBe(false)
    for (const failure of ["rate-limited", "offline", "busy", "generic"] as const) {
      expect(canRetry(failure)).toBe(true)
    }
  })
})

describe("cachedLoad", () => {
  it("asks once, then answers from memory", async () => {
    clearLyricsCache()
    const load = jest.fn(async () => ({ lines: ["a"] }))

    const first = await cachedLoad("k", load)
    const second = await cachedLoad("k", load)

    expect(load).toHaveBeenCalledTimes(1)
    expect(second).toBe(first)
  })

  it("keeps each key apart", async () => {
    clearLyricsCache()
    const load = jest.fn(async () => 1)
    await cachedLoad("a", load)
    await cachedLoad("b", load)
    expect(load).toHaveBeenCalledTimes(2)
  })

  it("asks again after ten minutes", async () => {
    clearLyricsCache()
    let now = 0
    const load = jest.fn(async () => now)

    await cachedLoad("k", load, () => now)
    now = 9 * 60 * 1000
    expect(await cachedLoad("k", load, () => now)).toBe(0)
    now = 10 * 60 * 1000
    expect(await cachedLoad("k", load, () => now)).toBe(10 * 60 * 1000)
    expect(load).toHaveBeenCalledTimes(2)
  })

  it("never keeps a failure", async () => {
    clearLyricsCache()
    const load = jest.fn<() => Promise<number>>().mockRejectedValueOnce(new Error("down"))
    load.mockResolvedValue(7)

    await expect(cachedLoad("k", load)).rejects.toThrow("down")

    expect(await cachedLoad("k", load)).toBe(7)
  })

  it("forgets the oldest entries when there are many", async () => {
    clearLyricsCache()
    const load = jest.fn(async () => 1)
    for (let index = 0; index < 41; index++) await cachedLoad(`k${index}`, load)
    expect(load).toHaveBeenCalledTimes(41)

    await cachedLoad("k40", load) // the newest is still there
    expect(load).toHaveBeenCalledTimes(41)
    await cachedLoad("k0", load) // the oldest is gone
    expect(load).toHaveBeenCalledTimes(42)
  })
})
