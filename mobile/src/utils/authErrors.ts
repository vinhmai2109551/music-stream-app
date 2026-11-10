import { ApiError } from "@/api/client"
import { t } from "@/i18n"

/** Turns whatever login/register threw into one sentence that is safe to show to the user. */
export function describeAuthError(error: unknown, mode: "login" | "register"): string {
  if (!(error instanceof ApiError)) return t("errors.unknown")
  // Connection problems already carry a translated message from the client.
  if (error.kind !== "http") return error.message
  if (error.status === 401 && mode === "login") return t("auth.errors.invalidCredentials")
  // Fields are checked on the device first, so a 400 on login means the Turnstile check failed.
  if (error.status === 400 && mode === "login") return t("auth.errors.turnstileFailed")
  if (error.status === 503 && mode === "login") return t("auth.errors.turnstileUnavailable")
  if (error.status === 409) return t("auth.errors.emailTaken")
  if (error.status === 429) return t("errors.tooManyRequests")
  if (error.status >= 500) return t("errors.server")
  return error.message
}
