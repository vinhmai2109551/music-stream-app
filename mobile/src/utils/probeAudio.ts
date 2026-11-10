const PROBE_TIMEOUT_MS = 8_000

/** What a HEAD request to an audio file tells us. */
export type ProbeResult = "ok" | "missing" | "network"

/**
 * Asks the server about an audio file without downloading it.
 * 404, 403 and 410 mean the file is not there ("missing"); no answer, or a server error, is
 * "network" (it may work later). The player loads the file at the same time, so this only exists
 * to report a missing file quickly instead of after the load timeout.
 */
export async function probeAudio(
  url: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs: number = PROBE_TIMEOUT_MS,
): Promise<ProbeResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetchImpl(url, { method: "HEAD", signal: controller.signal })
    if (response.ok) return "ok"
    if (response.status === 404 || response.status === 403 || response.status === 410) {
      return "missing"
    }
    return "network"
  } catch {
    return "network"
  } finally {
    clearTimeout(timer)
  }
}
