import { describe, expect, it } from "vitest"
import { formatClock, formatDuration, parseClock } from "./time"

describe("formatClock", () => {
  it.each([
    [0, "00:00.00"],
    [450, "00:00.45"],
    [83450, "01:23.45"],
    [600_000, "10:00.00"],
    [3_600_000, "60:00.00"],
  ])("%d ms is %s", (ms, text) => {
    expect(formatClock(ms)).toBe(text)
  })

  it("rounds to hundredths and never goes below zero", () => {
    expect(formatClock(1004)).toBe("00:01.00")
    expect(formatClock(1005)).toBe("00:01.01")
    expect(formatClock(-50)).toBe("00:00.00")
  })
})

describe("parseClock", () => {
  it.each([
    ["01:23.45", 83450],
    ["1:23.45", 83450],
    ["01:23", 83000],
    ["83.45", 83450],
    ["83", 83000],
    ["0:05,5", 5500],
    ["0:05.123", 5123],
    ["  0:10  ", 10000],
  ])("reads %s", (text, ms) => {
    expect(parseClock(text)).toBe(ms)
  })

  it.each(["", "abc", "1:2:3", "1:75", "-5", "1:23.4567", "1:"])("gives null for %p", (text) => {
    expect(parseClock(text)).toBeNull()
  })

  it("round-trips what formatClock writes", () => {
    for (const ms of [0, 10, 1230, 59_990, 61_000, 754_320]) {
      expect(parseClock(formatClock(ms))).toBe(ms)
    }
  })
})

describe("formatDuration", () => {
  it("writes minutes and two-digit seconds", () => {
    expect(formatDuration(205)).toBe("3:25")
    expect(formatDuration(59)).toBe("0:59")
    expect(formatDuration(3600)).toBe("60:00")
  })
})
