import { useCallback, useEffect, useRef, useState } from "react"
import { Toast } from "@/components/ui/Toast"

const TOAST_DURATION_MS = 1400

/** Returns `show(message)` and a `toast` element to render once in the screen. */
export function useToast() {
  const [message, setMessage] = useState("")
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  const show = useCallback((next: string) => {
    if (timer.current) clearTimeout(timer.current)
    setMessage(next)
    timer.current = setTimeout(() => setMessage(""), TOAST_DURATION_MS)
  }, [])

  return { show, toast: message ? <Toast message={message} /> : null }
}
