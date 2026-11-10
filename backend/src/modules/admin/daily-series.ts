import type { DailyCount } from "../../shared/index.js"

const DAY_MS = 24 * 60 * 60 * 1000

/** The `days` calendar days that end today in `timeZone`, oldest first, as `YYYY-MM-DD`. */
export function lastDays(days: number, now: Date, timeZone: string): string[] {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
  const [year, month, day] = today.split("-").map(Number)
  const end = Date.UTC(year, month - 1, day)
  return Array.from({ length: days }, (_, index) =>
    new Date(end - (days - 1 - index) * DAY_MS).toISOString().slice(0, 10),
  )
}

/** One entry per day, in the order of `days`: the rows of the database only have the days with data. */
export function fillDays(days: readonly string[], rows: readonly DailyCount[]): DailyCount[] {
  const byDay = new Map(rows.map((row) => [row.day, row.count]))
  return days.map((day) => ({ day, count: byDay.get(day) ?? 0 }))
}
