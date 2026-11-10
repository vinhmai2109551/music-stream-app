import { describe, expect, it, jest } from "@jest/globals"
import type { DailyCount } from "../../shared/index.js"
import { AdminStatsService } from "./admin-stats.service.js"
import type { DashboardSource, TopTrack } from "./ports.js"

const NOW = new Date("2026-11-10T05:00:00Z")

const TOP: TopTrack[] = [
  { id: "t2", title: "Title t2", artist: "Artist", coverUrl: "cover-t2", plays: 10 },
  { id: "t1", title: "Title t1", artist: "Artist", coverUrl: "cover-t1", plays: 8 },
]

interface Data {
  playRows?: DailyCount[]
  userRows?: DailyCount[]
}

function setup({ playRows = [], userRows = [] }: Data = {}) {
  const source = {
    counts: jest.fn<DashboardSource["counts"]>(async () => ({
      tracks: 12,
      artists: 4,
      albums: 3,
      users: 7,
      plays: 3456,
    })),
    playsByDay: jest.fn<DashboardSource["playsByDay"]>(async () => playRows),
    newUsersByDay: jest.fn<DashboardSource["newUsersByDay"]>(async () => userRows),
    topTracks: jest.fn<DashboardSource["topTracks"]>(async () => TOP),
  }
  return { service: new AdminStatsService(source), source }
}

describe("AdminStatsService.get", () => {
  it("reports the totals of every module", async () => {
    const { service } = setup()

    const { totals } = await service.get(NOW)

    expect(totals).toMatchObject({ tracks: 12, artists: 4, albums: 3, users: 7, plays: 3456 })
  })

  it("returns 14 days for each chart, oldest first, with zeros on the quiet days", async () => {
    const { service } = setup({
      playRows: [{ day: "2026-11-10", count: 5 }],
      userRows: [{ day: "2026-10-28", count: 2 }],
    })

    const stats = await service.get(NOW)

    expect(stats.playsByDay).toHaveLength(14)
    expect(stats.playsByDay[0]).toEqual({ day: "2026-10-28", count: 0 })
    expect(stats.playsByDay[13]).toEqual({ day: "2026-11-10", count: 5 })
    expect(stats.newUsersByDay).toHaveLength(14)
    expect(stats.newUsersByDay[0]).toEqual({ day: "2026-10-28", count: 2 })
    expect(stats.newUsersByDay[13]).toEqual({ day: "2026-11-10", count: 0 })
  })

  it("counts only the last 7 days for playsLast7Days", async () => {
    const { service } = setup({
      playRows: [
        { day: "2026-10-28", count: 100 }, // 13 days ago: outside the week
        { day: "2026-11-03", count: 50 }, // the day before the week starts
        { day: "2026-11-04", count: 1 }, // first day of the week (today is 2026-11-10)
        { day: "2026-11-05", count: 2 },
        { day: "2026-11-10", count: 4 }, // today
      ],
    })

    const { totals } = await service.get(NOW)

    expect(totals.playsLast7Days).toBe(7)
  })

  it("is 0 when nobody played anything", async () => {
    const { service } = setup()

    const stats = await service.get(NOW)

    expect(stats.totals.playsLast7Days).toBe(0)
    expect(stats.playsByDay.every((entry) => entry.count === 0)).toBe(true)
  })

  it("asks for 14 days of the Vietnamese time zone and for 5 top tracks", async () => {
    const { service, source } = setup()

    await service.get(NOW)

    expect(source.playsByDay).toHaveBeenCalledWith(14, "Asia/Ho_Chi_Minh")
    expect(source.newUsersByDay).toHaveBeenCalledWith(14, "Asia/Ho_Chi_Minh")
    expect(source.topTracks).toHaveBeenCalledWith(5)
  })

  it("passes the top tracks on in the order the source gave them", async () => {
    const { service } = setup()

    const { topTracks } = await service.get(NOW)

    expect(topTracks).toEqual(TOP)
  })
})
