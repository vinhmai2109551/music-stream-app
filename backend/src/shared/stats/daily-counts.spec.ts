import { describe, expect, it } from "@jest/globals"
import { dailyCountsQuery } from "./daily-counts.js"

describe("dailyCountsQuery", () => {
  const query = dailyCountsQuery("PlayEvent", 14, "Asia/Ho_Chi_Minh")
  const text = query.sql

  it("counts the table that was asked for", () => {
    expect(text).toContain('FROM "PlayEvent"')
    expect(dailyCountsQuery("User", 14, "UTC").sql).toContain('FROM "User"')
  })

  it("compares the bare createdAt column with the lower bound, so an index on it can be used", () => {
    expect(text).toMatch(/WHERE "createdAt" >= \(/)
  })

  it("sends the time zone and the number of days as parameters, never in the text", () => {
    expect(query.values).toContain("Asia/Ho_Chi_Minh")
    expect(query.values).toContain(13) // today and the 13 days before it
    expect(text).not.toContain("Asia/Ho_Chi_Minh")
  })

  it("groups and sorts by day", () => {
    expect(text).toMatch(/GROUP BY 1\s+ORDER BY 1/)
  })
})
