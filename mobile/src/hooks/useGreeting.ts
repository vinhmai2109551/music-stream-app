import { useEffect, useState } from "react"
import { greetingFor } from "@/utils/greeting"

const REFRESH_MS = 60_000

/** Greeting for the time of day; updates when the day part changes while the screen stays open. */
export function useGreeting(): string {
  const [greeting, setGreeting] = useState(() => greetingFor())
  useEffect(() => {
    const id = setInterval(() => setGreeting(greetingFor()), REFRESH_MS)
    return () => clearInterval(id)
  }, [])
  return greeting
}
