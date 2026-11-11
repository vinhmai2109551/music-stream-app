import { formatNumber } from "./time"

/** The greeting for an hour of the day (0-23). */
export function greetingFor(hour: number): string {
  if (hour < 11) return "Chào buổi sáng"
  if (hour < 14) return "Chào buổi trưa"
  if (hour < 18) return "Chào buổi chiều"
  return "Chào buổi tối"
}

/** One sentence about today, from the two numbers the dashboard has. */
export function todayLine(plays: number, newUsers: number): string {
  const parts: string[] = []
  if (plays > 0) parts.push(`${formatNumber(plays)} lượt nghe`)
  if (newUsers > 0) parts.push(`${formatNumber(newUsers)} người dùng mới`)
  if (parts.length === 0) return "Hôm nay chưa có lượt nghe hay người dùng mới."
  return `Hôm nay có ${parts.join(" và ")}.`
}

/** `items` repeated until there are at least `count` of them (a row of covers must not be short). */
export function fillTo<T>(items: readonly T[], count: number): T[] {
  if (items.length === 0) return []
  return Array.from(
    { length: Math.max(count, items.length) },
    (_, index) => items[index % items.length],
  )
}

interface Activity {
  plays: number
  newUsers: number
}

/**
 * The sentence under the greeting: today when anything happened today, else the last 7 days (an
 * empty "today" is no way to start a page), else that nothing has happened yet.
 */
export function activityLine(today: Activity, week: Activity): string {
  if (today.plays > 0 || today.newUsers > 0) return todayLine(today.plays, today.newUsers)
  if (week.plays > 0 || week.newUsers > 0) {
    return todayLine(week.plays, week.newUsers).replace("Hôm nay có", "7 ngày qua có")
  }
  return todayLine(0, 0)
}
