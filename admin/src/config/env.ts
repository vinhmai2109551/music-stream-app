const DEFAULT_API_URL = "http://localhost:3000/api"

/** Base URL of the API (with the /api prefix, without a trailing slash). */
export const API_URL = (import.meta.env.VITE_API_URL || DEFAULT_API_URL).replace(/\/+$/, "")

/** Cloudflare Turnstile Site Key; empty = the login form has no widget. */
export const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? ""
