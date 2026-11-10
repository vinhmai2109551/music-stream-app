const TTL_MS = 10 * 60 * 1000
const MAX_ENTRIES = 40

const entries = new Map<string, { at: number; value: unknown }>()

/**
 * Remembers what a load returned for a while, so opening the lyrics of a song again (or switching
 * between the original and its translation) asks the server nothing. A failure is never kept.
 */
export async function cachedLoad<T>(
  key: string,
  load: () => Promise<T>,
  now: () => number = Date.now,
): Promise<T> {
  const kept = entries.get(key)
  if (kept && now() - kept.at < TTL_MS) return kept.value as T

  const value = await load()
  entries.delete(key) // re-inserted last, so the oldest entry is the first in the map
  entries.set(key, { at: now(), value })
  if (entries.size > MAX_ENTRIES) {
    const oldest = entries.keys().next()
    if (!oldest.done) entries.delete(oldest.value)
  }
  return value
}

export function clearLyricsCache(): void {
  entries.clear()
}
