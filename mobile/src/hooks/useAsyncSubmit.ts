import { useCallback, useRef, useState } from "react"

/**
 * Runs a form submission once at a time. A ref (not state) guards re-entry, so a fast
 * double tap cannot start two requests before React has re-rendered.
 */
export function useAsyncSubmit() {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const running = useRef(false)

  const run = useCallback(
    async (task: () => Promise<void>, describeError: (e: unknown) => string) => {
      if (running.current) return
      running.current = true
      setSubmitting(true)
      setError(null)
      try {
        await task()
      } catch (caught) {
        setError(describeError(caught))
      } finally {
        running.current = false
        setSubmitting(false)
      }
    },
    [],
  )

  return { submitting, error, run }
}
