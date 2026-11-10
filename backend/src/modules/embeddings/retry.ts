export interface RetryOptions {
  /** Tries in all, the first one included. */
  attempts: number
  /** Wait before the second try; it doubles for every try after that. */
  baseDelayMs: number
  /** Whether an error is worth another try (a rate limit is; a bug is not). */
  shouldRetry: (error: unknown) => boolean
  /** Called before each wait, to tell the user. */
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void
  /** Replaceable so tests need not wait. */
  sleep?: (ms: number) => Promise<void>
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** Runs `task`, trying again with a growing wait while `shouldRetry` says it may help. */
export async function withBackoff<T>(task: () => Promise<T>, options: RetryOptions): Promise<T> {
  const sleep = options.sleep ?? wait
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await task()
    } catch (error) {
      if (attempt >= options.attempts || !options.shouldRetry(error)) throw error
      const delayMs = options.baseDelayMs * 2 ** (attempt - 1)
      options.onRetry?.(error, attempt, delayMs)
      await sleep(delayMs)
    }
  }
}
