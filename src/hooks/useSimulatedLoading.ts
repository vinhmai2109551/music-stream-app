import { useEffect, useState } from "react"

const DEFAULT_DELAY_MS = 600

/** Returns true for a short moment so screens can show their skeleton. Mock data is instant. */
export function useSimulatedLoading(delayMs: number = DEFAULT_DELAY_MS): boolean {
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), delayMs)
    return () => clearTimeout(timer)
  }, [delayMs])
  return loading
}
