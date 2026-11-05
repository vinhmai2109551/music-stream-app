/**
 * Cloudflare Turnstile (bot check on the login screen).
 *
 * - EXPO_PUBLIC_TURNSTILE_SITE_KEY: the widget's public Site Key. Empty = no widget and no token
 *   (only works while the backend has no TURNSTILE_SECRET_KEY, i.e. local development).
 * - EXPO_PUBLIC_TURNSTILE_HOSTNAME: on iOS / Android the widget runs in a WebView that pretends to
 *   be served from this hostname. It must be in the widget's hostname list on Cloudflare (and in
 *   the backend's TURNSTILE_ALLOWED_HOSTNAMES when that is set). Expo web uses the real page host.
 */
const siteKey = (process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY ?? "").trim()
const hostname = (process.env.EXPO_PUBLIC_TURNSTILE_HOSTNAME ?? "").trim() || "localhost"

export const TURNSTILE = {
  siteKey,
  enabled: siteKey.length > 0,
  /** Address the native WebView loads the widget page as. */
  baseUrl: `https://${hostname}/`,
  scriptUrl: "https://challenges.cloudflare.com/turnstile/v0/api.js",
  /** Height of the "normal" / "flexible" widget is 65px; a little room avoids clipping. */
  height: 70,
} as const

export type TurnstileAction = "login" | "register"
