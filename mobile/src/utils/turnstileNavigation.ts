const CLOUDFLARE_ORIGIN = "https://challenges.cloudflare.com"

export type NavigationDecision = "allow" | "open-externally" | "block"

/**
 * What the Turnstile WebView may load.
 *
 * iOS asks about EVERY frame, not only the page. Turnstile's challenge runs in frames it creates
 * by itself inside its own iframe (`about:blank`, `about:srcdoc`, ...), and refusing one of them
 * stops the check for good: the widget then spins for ever. So only the top-level page is policed:
 * it may be our own page or Cloudflare; a link of the widget (privacy, terms) opens in the system
 * browser instead of replacing the widget; anything else is blocked.
 */
export function decideNavigation(
  request: { url: string; isTopFrame?: boolean },
  baseUrl: string,
): NavigationDecision {
  if (request.isTopFrame === false) return "allow"
  const { url } = request
  if (url.startsWith(baseUrl) || url.startsWith(CLOUDFLARE_ORIGIN) || url.startsWith("about:")) {
    return "allow"
  }
  return /^https?:/.test(url) ? "open-externally" : "block"
}
