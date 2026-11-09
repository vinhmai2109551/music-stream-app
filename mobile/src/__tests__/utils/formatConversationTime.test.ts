import { describe, expect, it } from "@jest/globals"
import { fillCount } from "@/utils/fillCount"
import { formatConversationTime } from "@/utils/formatConversationTime"

const NOW = new Date(2026, 10, 9, 12, 0, 0).getTime() // 9 Nov 2026, local time
const ago = (seconds: number) => new Date(NOW - seconds * 1000).toISOString()

describe("formatConversationTime", () => {
  it.each([
    [0, "Vừa xong"],
    [59, "Vừa xong"],
    [60, "1 phút trước"],
    [59 * 60, "59 phút trước"],
    [3600, "1 giờ trước"],
    [23 * 3600, "23 giờ trước"],
    [24 * 3600, "Hôm qua"],
    [47 * 3600, "Hôm qua"],
    [2 * 24 * 3600, "2 ngày trước"],
    [6 * 24 * 3600, "6 ngày trước"],
  ])("%d seconds ago: %s", (seconds, expected) => {
    expect(formatConversationTime(ago(seconds), NOW)).toBe(expected)
  })

  it("older than a week: the date, day first, with zeros", () => {
    expect(formatConversationTime(new Date(2026, 2, 5, 9, 0).toISOString(), NOW)).toBe("05/03/2026")
    expect(formatConversationTime(new Date(2025, 11, 25, 9, 0).toISOString(), NOW)).toBe(
      "25/12/2025",
    )
  })

  it("a time in the future counts as just now", () => {
    expect(formatConversationTime(ago(-3600), NOW)).toBe("Vừa xong")
  })

  it("a date that cannot be read gives nothing", () => {
    expect(formatConversationTime("not a date", NOW)).toBe("")
    expect(formatConversationTime("", NOW)).toBe("")
  })
})

describe("fillCount", () => {
  it("puts the number where {n} is", () => {
    expect(fillCount("Còn {n} tin nhắn hôm nay", 5)).toBe("Còn 5 tin nhắn hôm nay")
    expect(fillCount("Xem thêm {n} bài", 0)).toBe("Xem thêm 0 bài")
  })

  it("leaves a text without {n} alone", () => {
    expect(fillCount("Hết", 3)).toBe("Hết")
  })
})
