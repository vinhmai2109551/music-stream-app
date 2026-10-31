import { copy } from "@/constants/copy"

const MORNING_START = 5
const AFTERNOON_START = 12
const EVENING_START = 18

/** Greeting for the time of day, e.g. "Good morning,". */
export function greetingFor(date: Date = new Date()): string {
  const hour = date.getHours()
  if (hour >= MORNING_START && hour < AFTERNOON_START) return copy.greeting.morning
  if (hour >= AFTERNOON_START && hour < EVENING_START) return copy.greeting.afternoon
  return copy.greeting.evening
}
