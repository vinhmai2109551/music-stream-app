import { ApiError } from "@/api/client"
import { t } from "@/i18n"

/** One sentence about any API failure that is safe to show to the user. */
export function describeApiError(error: unknown): string {
  if (!(error instanceof ApiError)) return t("errors.unknown")
  // Connection problems already carry a translated message from the client.
  if (error.kind !== "http") return error.message
  if (error.status === 429) return t("errors.tooManyRequests")
  if (error.status >= 500) return t("errors.server")
  return error.message || t("errors.unknown")
}

export const isNotFound = (error: unknown): boolean =>
  error instanceof ApiError && error.status === 404
