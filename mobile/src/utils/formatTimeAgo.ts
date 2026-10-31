const MINUTE = 60
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY
const MONTH = 30 * DAY
const YEAR = 365 * DAY

/** How long ago an ISO date was, in the short form of the design: "now", "48m", "17h", "3d". */
export function formatTimeAgo(iso: string, now: number = Date.now()): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ""
  const seconds = Math.max(0, Math.floor((now - then) / 1000))
  if (seconds < MINUTE) return "now"
  if (seconds < HOUR) return `${Math.floor(seconds / MINUTE)}m`
  if (seconds < DAY) return `${Math.floor(seconds / HOUR)}h`
  if (seconds < WEEK) return `${Math.floor(seconds / DAY)}d`
  if (seconds < MONTH) return `${Math.floor(seconds / WEEK)}w`
  if (seconds < YEAR) return `${Math.floor(seconds / MONTH)}mo`
  return `${Math.floor(seconds / YEAR)}y`
}
