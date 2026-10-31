import { useCallback, useEffect, useRef, useState } from "react"

export type Resource<T> =
  { status: "loading" } | { status: "error"; error: unknown } | { status: "ready"; data: T }

/**
 * Loads one piece of data and tracks its loading / error / ready state.
 * It loads again whenever `key` changes (put every input of `load` in the key).
 * Answers that arrive after a newer request started are ignored.
 */
export function useResource<T>(load: () => Promise<T>, key: string) {
  const [state, setState] = useState<Resource<T>>({ status: "loading" })
  const loader = useRef(load)
  const latest = useRef(0)

  useEffect(() => {
    loader.current = load
  })

  const run = useCallback(async (silent: boolean) => {
    const id = ++latest.current
    if (!silent) setState({ status: "loading" })
    try {
      const data = await loader.current()
      if (id === latest.current) setState({ status: "ready", data })
    } catch (error) {
      // A failed background refresh keeps showing the data we already have.
      if (id === latest.current) {
        setState((current) =>
          silent && current.status === "ready" ? current : { status: "error", error },
        )
      }
    }
  }, [])

  useEffect(() => {
    void run(false)
    const counter = latest
    // A new key (or leaving the screen) makes any answer still on its way obsolete.
    return () => {
      counter.current += 1
    }
  }, [key, run])

  /** Shows the loading state again (use it for "try again"). */
  const reload = useCallback(() => run(false), [run])
  /** Fetches again without flashing the skeleton. */
  const refresh = useCallback(() => run(true), [run])

  return { state, reload, refresh }
}
