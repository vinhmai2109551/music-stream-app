import { describe, expect, it } from "@jest/globals"
import { fillDays, lastDays } from "./daily-series.js"

describe("lastDays", () => {
  it("lists the days up to today, oldest first", () => {
    const days = lastDays(3, new Date("2026-11-10T05:00:00Z"), "Asia/Ho_Chi_Minh")
    expect(days).toEqual(["2026-11-08", "2026-11-09", "2026-11-10"])
  })

  it("uses the day of the time zone, not of UTC", () => {
    // 20:00 UTC is already the next morning in Vietnam (UTC+7).
    const now = new Date("2026-11-10T20:00:00Z")
    expect(lastDays(1, now, "Asia/Ho_Chi_Minh")).toEqual(["2026-11-11"])
    expect(lastDays(1, now, "UTC")).toEqual(["2026-11-10"])
  })

  it("crosses a month and a year", () => {
    const days = lastDays(3, new Date("2027-01-01T05:00:00Z"), "UTC")
    expect(days).toEqual(["2026-12-30", "2026-12-31", "2027-01-01"])
  })

  it("covers 14 distinct days", () => {
    const days = lastDays(14, new Date("2026-11-10T05:00:00Z"), "Asia/Ho_Chi_Minh")
    expect(days).toHaveLength(14)
    expect(new Set(days).size).toBe(14)
    expect(days[0]).toBe("2026-10-28")
  })
})

describe("fillDays", () => {
  it("puts a zero on the days without rows and keeps the order of the days", () => {
    const filled = fillDays(
      ["2026-11-08", "2026-11-09", "2026-11-10"],
      [
        { day: "2026-11-10", count: 4 },
        { day: "2026-11-08", count: 1 },
      ],
    )
    expect(filled).toEqual([
      { day: "2026-11-08", count: 1 },
      { day: "2026-11-09", count: 0 },
      { day: "2026-11-10", count: 4 },
    ])
  })

  it("drops rows outside the days", () => {
    expect(fillDays(["2026-11-10"], [{ day: "2026-01-01", count: 9 }])).toEqual([
      { day: "2026-11-10", count: 0 },
    ])
  })
})
