import { ApiError } from "@/api/client"
import { copy } from "@/constants/copy"

/** One sentence about any API failure that is safe to show to the user. */
export function describeApiError(error: unknown): string {
  if (!(error instanceof ApiError)) return copy.errors.unknown
  // Connection problems already carry a translated message from the client.
  if (error.kind !== "http") return error.message
  if (error.status === 429) return copy.errors.tooManyRequests
  if (error.status >= 500) return copy.errors.server
  return error.message || copy.errors.unknown
}

export const isNotFound = (error: unknown): boolean =>
  error instanceof ApiError && error.status === 404
