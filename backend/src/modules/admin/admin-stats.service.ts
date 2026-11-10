import { Inject, Injectable } from "@nestjs/common"
import type { DailyCount } from "../../shared/index.js"
import { STATS_DAYS, STATS_TIME_ZONE, TOP_TRACKS } from "./admin.config.js"
import { fillDays, lastDays } from "./daily-series.js"
import { DASHBOARD_SOURCE, type DashboardSource, type TopTrack } from "./ports.js"

export interface AdminStats {
  totals: {
    tracks: number
    artists: number
    albums: number
    users: number
    /** The plays of all tracks added up (the number the app shows). */
    plays: number
    /** Listens counted in the last 7 days. */
    playsLast7Days: number
  }
  topTracks: TopTrack[]
  /** One entry per day for the last 14 days, oldest first; days without plays have count 0. */
  playsByDay: DailyCount[]
  newUsersByDay: DailyCount[]
}

const WEEK = 7

/** Numbers for the dashboard. */
@Injectable()
export class AdminStatsService {
  constructor(@Inject(DASHBOARD_SOURCE) private readonly source: DashboardSource) {}

  async get(now: Date = new Date()): Promise<AdminStats> {
    const days = lastDays(STATS_DAYS, now, STATS_TIME_ZONE)
    const [counts, playRows, userRows, topTracks] = await Promise.all([
      this.source.counts(),
      this.source.playsByDay(STATS_DAYS, STATS_TIME_ZONE),
      this.source.newUsersByDay(STATS_DAYS, STATS_TIME_ZONE),
      this.source.topTracks(TOP_TRACKS),
    ])
    const playsByDay = fillDays(days, playRows)
    return {
      totals: {
        ...counts,
        playsLast7Days: playsByDay.slice(-WEEK).reduce((sum, entry) => sum + entry.count, 0),
      },
      topTracks,
      playsByDay,
      newUsersByDay: fillDays(days, userRows),
    }
  }
}
