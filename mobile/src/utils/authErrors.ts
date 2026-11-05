import { ApiError } from "@/api/client"
import { copy } from "@/constants/copy"

/** Turns whatever login/register threw into one sentence that is safe to show to the user. */
export function describeAuthError(error: unknown, mode: "login" | "register"): string {
  if (!(error instanceof ApiError)) return copy.errors.unknown
  // Connection problems already carry a translated message from the client.
  if (error.kind !== "http") return error.message
  if (error.status === 401 && mode === "login") return copy.auth.errors.invalidCredentials
  // Fields are checked on the device first, so a 400 on login means the Turnstile check failed.
  if (error.status === 400 && mode === "login") return copy.auth.errors.turnstileFailed
  if (error.status === 503 && mode === "login") return copy.auth.errors.turnstileUnavailable
  if (error.status === 409) return copy.auth.errors.emailTaken
  if (error.status === 429) return copy.errors.tooManyRequests
  if (error.status >= 500) return copy.errors.server
  return error.message
}
