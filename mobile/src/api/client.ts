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
  /** Called when a request that carried a token comes back 401 (expired or invalid token). */
  onUnauthorized: () => void
}

let handlers: ApiHandlers = { getToken: () => null, onUnauthorized: () => {} }

/** Wires the client to the auth store without importing it (avoids a circular dependency). */
export function configureApi(next: Partial<ApiHandlers>): void {
  handlers = { ...handlers, ...next }
}

export interface RequestOptions {
  /** Do not send the token and do not treat a 401 as an expired session (login, register). */
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

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> {
  if (!BASE_URL) {
    throw new ApiError({ status: 0, kind: "network", message: copy.errors.notConfigured })
  }

  const token = options.skipAuth ? null : handlers.getToken()
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
    const error = new ApiError({
      status,
      kind: "http",
      message: messageFromBody(data, status),
      details: data,
    })
    if (status === 401 && token) handlers.onUnauthorized()
    throw error
  }
  return data as T
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
