/** One reverse proxy (Railway, Render, nginx...) sits in front of the API unless told otherwise. */
const DEFAULT_TRUST_PROXY = 1

/**
 * Reads TRUST_PROXY for Express: a number of proxy hops, `true` / `false`, or an address list such
 * as `loopback, 10.0.0.0/8`. With it the rate limiter sees the visitor's IP instead of the proxy's.
 * Set `false` (or 0) when the API is reachable directly: the header is then written by the client.
 */
export function parseTrustProxy(value: string | undefined): boolean | number | string {
  const text = value?.trim() ?? ""
  if (text === "") return DEFAULT_TRUST_PROXY
  if (/^\d+$/.test(text)) return Number(text)
  if (text === "true") return true
  if (text === "false") return false
  return text
}
