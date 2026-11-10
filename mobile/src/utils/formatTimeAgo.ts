import { t } from "@/i18n"

const MINUTE = 60
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY
const MONTH = 30 * DAY
const YEAR = 365 * DAY

/** How long ago an ISO date was, in the short form of the design: "Vừa xong", "48 phút", "3 ngày". */
export function formatTimeAgo(iso: string, now: number = Date.now()): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ""
  const seconds = Math.max(0, Math.floor((now - then) / 1000))
  if (seconds < MINUTE) return t("time.ago.now")
  if (seconds < HOUR) return t("time.ago.minutes", { count: Math.floor(seconds / MINUTE) })
  if (seconds < DAY) return t("time.ago.hours", { count: Math.floor(seconds / HOUR) })
  if (seconds < WEEK) return t("time.ago.days", { count: Math.floor(seconds / DAY) })
  if (seconds < MONTH) return t("time.ago.weeks", { count: Math.floor(seconds / WEEK) })
  if (seconds < YEAR) return t("time.ago.months", { count: Math.floor(seconds / MONTH) })
  return t("time.ago.years", { count: Math.floor(seconds / YEAR) })
}
