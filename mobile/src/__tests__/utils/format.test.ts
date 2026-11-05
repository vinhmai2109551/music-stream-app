import { describe, expect, it, jest } from "@jest/globals"
import { copy } from "@/constants/copy"
import { toggleId } from "@/utils/collections"
import { createId } from "@/utils/createId"
import { formatCount, formatNumber } from "@/utils/formatCount"
import { formatTime } from "@/utils/formatTime"
import { formatTimeAgo } from "@/utils/formatTimeAgo"
import { greetingFor } from "@/utils/greeting"
import { hashOf, initialsOf } from "@/utils/initials"
import { plural } from "@/utils/plural"
import { createWaveform } from "@/utils/waveform"

const NOW = Date.parse("2026-10-31T12:00:00Z")
const ago = (seconds: number) => new Date(NOW - seconds * 1000).toISOString()

describe("formatTimeAgo", () => {
  it("uses the short forms of the design", () => {
    expect(formatTimeAgo(ago(5), NOW)).toBe("now")
    expect(formatTimeAgo(ago(48 * 60), NOW)).toBe("48m")
    expect(formatTimeAgo(ago(17 * 3600), NOW)).toBe("17h")
    expect(formatTimeAgo(ago(3 * 86400), NOW)).toBe("3d")
    expect(formatTimeAgo(ago(14 * 86400), NOW)).toBe("2w")
    expect(formatTimeAgo(ago(90 * 86400), NOW)).toBe("3mo")
    expect(formatTimeAgo(ago(800 * 86400), NOW)).toBe("2y")
  })

  it("switches unit exactly at the boundaries", () => {
    expect(formatTimeAgo(ago(59), NOW)).toBe("now")
    expect(formatTimeAgo(ago(60), NOW)).toBe("1m")
    expect(formatTimeAgo(ago(3599), NOW)).toBe("59m")
    expect(formatTimeAgo(ago(3600), NOW)).toBe("1h")
    expect(formatTimeAgo(ago(86400), NOW)).toBe("1d")
    expect(formatTimeAgo(ago(7 * 86400), NOW)).toBe("1w")
  })

  it("copes with the future and with bad dates", () => {
    expect(formatTimeAgo(ago(-500), NOW)).toBe("now")
    expect(formatTimeAgo("not a date", NOW)).toBe("")
  })

  it("uses the current time by default", () => {
    jest.useFakeTimers({ now: NOW })

    expect(formatTimeAgo(ago(2 * 3600))).toBe("2h")
  })
})

describe("formatCount and formatNumber", () => {
  it("shortens thousands and millions", () => {
    expect(formatCount(0)).toBe("0")
    expect(formatCount(999)).toBe("999")
    expect(formatCount(1000)).toBe("1K")
    expect(formatCount(65_100)).toBe("65.1K")
    expect(formatCount(123_456)).toBe("123K")
    expect(formatCount(2_100_000)).toBe("2.1M")
    expect(formatCount(150_000_000)).toBe("150M")
  })

  it("puts thousands separators in numbers", () => {
    expect(formatNumber(1234)).toBe("1,234")
    expect(formatNumber(999)).toBe("999")
    expect(formatNumber(1234567.6)).toBe("1,234,568")
  })
})

describe("formatTime", () => {
  it("formats seconds as m:ss", () => {
    expect(formatTime(0)).toBe("0:00")
    expect(formatTime(9.9)).toBe("0:09")
    expect(formatTime(75)).toBe("1:15")
    expect(formatTime(3600)).toBe("60:00")
  })

  it("never shows a negative time", () => {
    expect(formatTime(-5)).toBe("0:00")
  })
})

describe("plural", () => {
  it("adds an s except for exactly one", () => {
    expect(plural("like", 1)).toBe("like")
    expect(plural("like", 0)).toBe("likes")
    expect(plural("like", 2)).toBe("likes")
  })
})

describe("greetingFor", () => {
  const at = (hour: number) => greetingFor(new Date(2026, 0, 1, hour))

  it("changes with the hour", () => {
    expect(at(5)).toBe(copy.greeting.morning)
    expect(at(11)).toBe(copy.greeting.morning)
    expect(at(12)).toBe(copy.greeting.afternoon)
    expect(at(17)).toBe(copy.greeting.afternoon)
    expect(at(18)).toBe(copy.greeting.evening)
    expect(at(23)).toBe(copy.greeting.evening)
    expect(at(0)).toBe(copy.greeting.evening)
    expect(at(4)).toBe(copy.greeting.evening)
  })

  it("uses the current time by default", () => {
    jest.useFakeTimers({ now: new Date(2026, 0, 1, 8) })

    expect(greetingFor()).toBe(copy.greeting.morning)
  })
})

describe("initialsOf", () => {
  it("takes the first letters of the first two words", () => {
    expect(initialsOf("Sơn Tùng M-TP")).toBe("ST")
    expect(initialsOf("Ryan Young")).toBe("RY")
    expect(initialsOf("Đen Vâu")).toBe("DV")
  })

  it("takes two letters of a single word", () => {
    expect(initialsOf("BTS")).toBe("BT")
    expect(initialsOf("IU")).toBe("IU")
    expect(initialsOf("A")).toBe("A")
  })

  it("ignores punctuation and gives nothing for an empty name", () => {
    expect(initialsOf("  ...  ")).toBe("")
    expect(initialsOf("")).toBe("")
    expect(initialsOf("(G)I-DLE band")).toBe("GI")
  })
})

describe("hashOf", () => {
  it("is stable and spreads different texts", () => {
    expect(hashOf("BTS")).toBe(hashOf("BTS"))
    expect(hashOf("BTS")).not.toBe(hashOf("IU"))
    expect(Number.isInteger(hashOf("anything"))).toBe(true)
    expect(hashOf("")).toBeGreaterThanOrEqual(0)
  })
})

describe("createWaveform", () => {
  it("returns the asked number of bars between 0.25 and 1", () => {
    const bars = createWaveform("track-a", 48)

    expect(bars).toHaveLength(48)
    expect(bars.every((bar) => bar >= 0.25 && bar <= 1)).toBe(true)
  })

  it("is the same for the same track and different for another", () => {
    expect(createWaveform("a", 20)).toEqual(createWaveform("a", 20))
    expect(createWaveform("a", 20)).not.toEqual(createWaveform("b", 20))
  })
})

describe("toggleId and createId", () => {
  it("toggleId adds a missing id and removes a present one, without changing the input", () => {
    const ids = ["a", "b"]

    expect(toggleId(ids, "c")).toEqual(["a", "b", "c"])
    expect(toggleId(ids, "a")).toEqual(["b"])
    expect(ids).toEqual(["a", "b"])
  })

  it("createId starts with the prefix and differs between calls", () => {
    expect(createId("pl")).toMatch(/^pl-/)
    expect(createId()).toMatch(/^id-/)
    expect(createId("x")).not.toBe(createId("x"))
  })
})
