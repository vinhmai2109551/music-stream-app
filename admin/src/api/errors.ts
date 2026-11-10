import type { HttpError } from "@refinedev/core"

/** An error answer of the API (or a failure to reach it, status 0). Fits Refine's `HttpError`. */
export class ApiError extends Error implements HttpError {
  readonly statusCode: number
  /** Machine-readable code some endpoints add (e.g. LYRICS_NOT_FOUND). */
  readonly code?: string

  constructor(statusCode: number, message: string, code?: string) {
    super(message)
    this.name = "ApiError"
    this.statusCode = statusCode
    this.code = code
  }
}

/** Nest answers `{ message: string | string[], code?: string }`; validation errors are a list. */
export function errorFromBody(status: number, body: unknown, fallback: string): ApiError {
  if (typeof body === "object" && body !== null) {
    const { message, code } = body as { message?: unknown; code?: unknown }
    const text = Array.isArray(message)
      ? message.filter((part): part is string => typeof part === "string").join("; ")
      : typeof message === "string"
        ? message
        : ""
    return new ApiError(status, text || fallback, typeof code === "string" ? code : undefined)
  }
  return new ApiError(status, fallback)
}

/** The text to show a person for any thrown value. */
export function describeError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  return "Đã xảy ra lỗi không xác định."
}
