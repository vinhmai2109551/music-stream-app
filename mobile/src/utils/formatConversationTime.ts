import { copy } from "@/constants/copy"
import { fillCount as fill } from "./fillCount"

const MINUTE = 60
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY

/** When a conversation was last used, the way people say it: "Vừa xong", "3 giờ trước", "12/03/2026". */
export function formatConversationTime(iso: string, now: number = Date.now()): string {
  const then = new Date(iso)
  if (Number.isNaN(then.getTime())) return ""
  const { time } = copy.assistant
  const seconds = Math.max(0, Math.floor((now - then.getTime()) / 1000))
  if (seconds < MINUTE) return time.justNow
  if (seconds < HOUR) return fill(time.minutes, Math.floor(seconds / MINUTE))
  if (seconds < DAY) return fill(time.hours, Math.floor(seconds / HOUR))
  if (seconds < 2 * DAY) return time.yesterday
  if (seconds < WEEK) return fill(time.days, Math.floor(seconds / DAY))
  const day = String(then.getDate()).padStart(2, "0")
  const month = String(then.getMonth() + 1).padStart(2, "0")
  return `${day}/${month}/${then.getFullYear()}`
}
