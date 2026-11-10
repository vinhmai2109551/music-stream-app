import { API_URL } from "@/config/env"
import { ApiError, errorFromBody } from "./errors"
import { tokenStore, type TokenPair } from "./tokens"

export type QueryValue = string | number | boolean | null | undefined

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  query?: Record<string, QueryValue>
  body?: unknown
  signal?: AbortSignal
  /** Send the access token and refresh it on a 401 (default true). */
  auth?: boolean
}

const NETWORK_ERROR = "Không kết nối được máy chủ. Kiểm tra mạng hoặc địa chỉ API."

type Listener = () => void
const expiredListeners = new Set<Listener>()

/** Called when the session cannot be renewed any more (the person has to log in again). */
export function onSessionExpired(listener: Listener): () => void {
  expiredListeners.add(listener)
  return () => expiredListeners.delete(listener)
}

export function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const url = new URL(`${API_URL}${path}`, window.location.origin)
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

async function send(path: string, options: RequestOptions): Promise<Response> {
  const headers = new Headers({ Accept: "application/json" })
  if (options.body !== undefined) headers.set("Content-Type", "application/json")
  const token = options.auth === false ? null : tokenStore.accessToken
  if (token) headers.set("Authorization", `Bearer ${token}`)
  try {
    return await fetch(buildUrl(path, options.query), {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error
    throw new ApiError(0, NETWORK_ERROR)
  }
}

async function readBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined
  const text = await response.text()
  if (!text) return undefined
  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

let refreshing: Promise<boolean> | null = null

/**
 * Exchanges the refresh token for a new pair. Refresh tokens rotate (the one used is revoked), so
 * parallel callers MUST share one request: the second would present an already used token. Resolves
 * false when the session is over, and throws when the server could not be reached (the person is
 * then kept logged in and can try again).
 */
export function refreshSession(): Promise<boolean> {
  refreshing ??= performRefresh()
    .then((renewed) => {
      // Once per failed refresh, however many requests were waiting for it.
      if (!renewed) endSession()
      return renewed
    })
    .finally(() => {
      refreshing = null
    })
  return refreshing
}

async function performRefresh(): Promise<boolean> {
  const used = tokenStore.refreshToken
  if (!used) return false
  const response = await send("/auth/refresh", {
    method: "POST",
    body: { refreshToken: used },
    auth: false,
  })
  if (response.ok) {
    tokenStore.save((await readBody(response)) as TokenPair)
    return true
  }
  if (response.status >= 500 || response.status === 429) {
    throw errorFromBody(response.status, await readBody(response), NETWORK_ERROR)
  }
  // Another tab may have rotated the token a moment ago; its new pair is in storage already.
  const current = tokenStore.refreshToken
  return current !== null && current !== used
}

function endSession(): void {
  tokenStore.clear()
  expiredListeners.forEach((listener) => listener())
}

/** One call to the API as the logged-in admin. Throws `ApiError` for every failure. */
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response = await send(path, options)
  if (response.status === 401 && options.auth !== false && tokenStore.refreshToken) {
    if (await refreshSession()) response = await send(path, options)
  }
  const body = await readBody(response)
  if (!response.ok) {
    throw errorFromBody(response.status, body, `Yêu cầu thất bại (${response.status}).`)
  }
  return body as T
}
