import type { TranslationKey } from "@/i18n"

const MORNING_START = 5
const AFTERNOON_START = 12
const EVENING_START = 18

/** The text of the greeting for the time of day ("Chào buổi sáng,"); the screen translates it. */
export function greetingKeyFor(date: Date = new Date()): TranslationKey {
  const hour = date.getHours()
  if (hour >= MORNING_START && hour < AFTERNOON_START) return "home.greeting.morning"
  if (hour >= AFTERNOON_START && hour < EVENING_START) return "home.greeting.afternoon"
  return "home.greeting.evening"
}
