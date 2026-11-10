import { ApiError } from "@/api/client"
import type { ChatError } from "./chatState"
import { t } from "@/i18n"

/** What a failed request to the assistant means to the person, and what to show. */
export function describeAssistantError(error: unknown): ChatError {
  if (!(error instanceof ApiError))
    return { kind: "generic", message: t("assistant.errors.generic") }
  if (error.kind === "network" || error.kind === "timeout") {
    return { kind: "offline", message: t("assistant.errors.offline") }
  }
  switch (error.status) {
    case 429:
      // The server says whether it is the daily limit (its message names it) or a burst.
      return { kind: "quota", message: error.message || t("assistant.errors.quota") }
    case 503:
      return { kind: "unavailable", message: t("assistant.errors.unavailable") }
    case 409:
      return { kind: "conflict", message: error.message || t("assistant.errors.conflict") }
    case 410:
      return { kind: "expired", message: t("assistant.errors.expired") }
    case 404:
      return { kind: "gone", message: t("assistant.errors.gone") }
    default:
      return { kind: "generic", message: t("assistant.errors.generic") }
  }
}

/** An `error` event of the stream: the server wrote the message for the person. */
export function describeStreamError(code: string, message: string): ChatError {
  return {
    kind: code === "assistant_busy" || code === "assistant_unavailable" ? "busy" : "generic",
    message: message || t("assistant.errors.generic"),
  }
}
