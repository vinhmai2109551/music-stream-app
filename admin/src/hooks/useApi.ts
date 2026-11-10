import { useCallback, useEffect, useState } from "react"
import { api, type QueryValue } from "@/api/http"
import { ApiError, describeError } from "@/api/errors"

interface Result<T> {
  key: string | null
  data?: T
  error?: ApiError
}

export interface ApiQuery<T> {
  data: T | undefined
  error: ApiError | null
  /** True from the moment a request starts until its answer arrives (data of the last one stays). */
  loading: boolean
  reload: () => void
}

/**
 * Reads one endpoint of the API for a page that Refine's resource hooks do not fit (the dashboard,
 * the lyrics). `path` null = do not ask yet. Answers of an outdated request are dropped.
 */
export function useApi<T>(path: string | null, query?: Record<string, QueryValue>): ApiQuery<T> {
  const [nonce, setNonce] = useState(0)
  const [result, setResult] = useState<Result<T>>({ key: null })
  const queryKey = JSON.stringify(query ?? {})
  const requestKey = path === null ? null : `${nonce}|${path}|${queryKey}`

  useEffect(() => {
    if (path === null || requestKey === null) return
    const controller = new AbortController()
    api<T>(path, {
      query: JSON.parse(queryKey) as Record<string, QueryValue>,
      signal: controller.signal,
    })
      .then((data) => setResult({ key: requestKey, data }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setResult((previous) => ({
          key: requestKey,
          data: previous.data,
          error: error instanceof ApiError ? error : new ApiError(0, describeError(error)),
        }))
      })
    return () => controller.abort()
  }, [path, queryKey, requestKey])

  const reload = useCallback(() => setNonce((value) => value + 1), [])
  const settled = result.key === requestKey
  return {
    data: result.data,
    error: settled ? (result.error ?? null) : null,
    loading: requestKey !== null && !settled,
    reload,
  }
}
