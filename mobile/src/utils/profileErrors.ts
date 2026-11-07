import { ApiError } from "@/api/client"
import { copy } from "@/constants/copy"

/** Turns whatever saving the profile threw into one sentence that is safe to show to the user. */
export function describeProfileError(error: unknown): string {
  if (!(error instanceof ApiError)) return copy.errors.unknown
  // Connection problems and upload failures already carry a translated message.
  if (error.kind !== "http") return error.message
  if (error.status === 429) return copy.errors.tooManyRequests
  if (error.status >= 500) return copy.errors.server
  return error.message
}
