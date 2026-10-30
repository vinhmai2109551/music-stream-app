import { copy } from "@/constants/copy"

const REQUEST_TIMEOUT_MS = 15_000
const BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/+$/, "")

export type ApiErrorKind = "http" | "network" | "timeout"

/** Every failure of an API call. `status` is 0 when the server could not be reached. */
export class ApiError extends Error {
  readonly status: number
  readonly kind: ApiErrorKind
  /** The parsed response body (or undefined). */
  readonly details: unknown

  constructor(params: { status: number; kind: ApiErrorKind; message: string; details?: unknown }) {
    super(params.message)
    // Keeps `instanceof ApiError` working however the class gets compiled.
    Object.setPrototypeOf(this, ApiError.prototype)
    this.name = "ApiError"
    this.status = params.status
    this.kind = params.kind
    this.details = params.details
  }
}

interface ApiHandlers {
  getToken: () => string | null
  /**
   * Exchanges the stored refresh token for a new token pair and returns the new access token.
   * Returns null when the server rejected the refresh token (the session is over) and throws an
   * ApiError for network or server trouble (the session may still be fine).
   */
  refreshSession: () => Promise<string | null>
  /** Called when the session cannot be continued: refresh was rejected or the retry was 401. */
  onUnauthorized: () => void
}

let handlers: ApiHandlers = {
  getToken: () => null,
  refreshSession: () => Promise.resolve(null),
  onUnauthorized: () => {},
}

/** Wires the client to the auth store without importing it (avoids a circular dependency). */
export function configureApi(next: Partial<ApiHandlers>): void {
  handlers = { ...handlers, ...next }
}

export interface RequestOptions {
  /** No token, no refresh, no logout on 401 (login, register, refresh, logout). */
  skipAuth?: boolean
}

function parseBody(text: string): unknown {
  if (!text) return undefined
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

/** NestJS puts a string, or an array of strings for validation errors, in `message`. */
function messageFromBody(body: unknown, status: number): string {
  if (typeof body === "object" && body !== null && "message" in body) {
    const { message } = body as { message: unknown }
    if (Array.isArray(message)) {
      const text = message.filter((item): item is string => typeof item === "string").join("; ")
      if (text) return text
    } else if (typeof message === "string" && message) {
      return message
    }
  }
  return status >= 500 ? copy.errors.server : copy.errors.unknown
}

/** One HTTP round trip with the given token. Throws ApiError for anything but a 2xx answer. */
async function send<T>(
  method: string,
  path: string,
  body: unknown,
  token: string | null,
): Promise<T> {
  if (!BASE_URL) {
    throw new ApiError({ status: 0, kind: "network", message: copy.errors.notConfigured })
  }

  const headers: Record<string, string> = { Accept: "application/json" }
  if (body !== undefined) headers["Content-Type"] = "application/json"
  if (token) headers.Authorization = `Bearer ${token}`

  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, REQUEST_TIMEOUT_MS)

  let status: number
  let ok: boolean
  let data: unknown
  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    })
    status = response.status
    ok = response.ok
    data = parseBody(await response.text())
  } catch {
    throw new ApiError(
      timedOut
        ? { status: 0, kind: "timeout", message: copy.errors.timeout }
        : { status: 0, kind: "network", message: copy.errors.network },
    )
  } finally {
    clearTimeout(timer)
  }

  if (!ok) {
    throw new ApiError({
      status,
      kind: "http",
      message: messageFromBody(data, status),
      details: data,
    })
  }
  return data as T
}

let refreshInFlight: Promise<string | null> | null = null

/** Gets a fresh access token. Every request that hits a 401 at the same time shares one refresh. */
function renewAccessToken(rejectedToken: string): Promise<string | null> {
  // Another request already renewed the token while this one was in flight: reuse the new one.
  const current = handlers.getToken()
  if (current && current !== rejectedToken) return Promise.resolve(current)

  refreshInFlight ??= handlers.refreshSession().finally(() => {
    refreshInFlight = null
  })
  return refreshInFlight
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> {
  const token = options.skipAuth ? null : handlers.getToken()
  try {
    return await send<T>(method, path, body, token)
  } catch (error) {
    // Only an authenticated request that was rejected is worth a refresh.
    if (!token || !(error instanceof ApiError) || error.status !== 401) throw error

    // Network trouble while refreshing throws here and keeps the session; the caller just sees it.
    const freshToken = await renewAccessToken(token)
    if (!freshToken) {
      handlers.onUnauthorized()
      throw error
    }

    try {
      return await send<T>(method, path, body, freshToken) // retried exactly once
    } catch (retryError) {
      if (retryError instanceof ApiError && retryError.status === 401) handlers.onUnauthorized()
      throw retryError
    }
  }
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>("GET", path, undefined, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("POST", path, body, options),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("PATCH", path, body, options),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("PUT", path, body, options),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>("DELETE", path, undefined, options),
}
