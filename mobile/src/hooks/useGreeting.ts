import { useEffect, useState } from "react"
import type { TranslationKey } from "@/i18n"
import { greetingKeyFor } from "@/utils/greeting"

const REFRESH_MS = 60_000

/** Greeting for the time of day; updates when the day part changes while the screen stays open. */
export function useGreeting(): TranslationKey {
  const [greeting, setGreeting] = useState(() => greetingKeyFor())
  useEffect(() => {
    const id = setInterval(() => setGreeting(greetingKeyFor()), REFRESH_MS)
    return () => clearInterval(id)
  }, [])
  return greeting
}
