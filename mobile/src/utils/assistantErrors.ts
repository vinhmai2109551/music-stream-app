import { ApiError } from "@/api/client"
import { copy } from "@/constants/copy"
import type { ChatError } from "./chatState"

const text = copy.assistant.errors

/** What a failed request to the assistant means to the person, and what to show. */
export function describeAssistantError(error: unknown): ChatError {
  if (!(error instanceof ApiError)) return { kind: "generic", message: text.generic }
  if (error.kind === "network" || error.kind === "timeout") {
    return { kind: "offline", message: text.offline }
  }
  switch (error.status) {
    case 429:
      // The server says whether it is the daily limit (its message names it) or a burst.
      return { kind: "quota", message: error.message || text.quota }
    case 503:
      return { kind: "unavailable", message: text.unavailable }
    case 409:
      return { kind: "conflict", message: error.message || text.conflict }
    case 410:
      return { kind: "expired", message: text.expired }
    case 404:
      return { kind: "gone", message: text.gone }
    default:
      return { kind: "generic", message: text.generic }
  }
}

/** An `error` event of the stream: the server wrote the message for the person. */
export function describeStreamError(code: string, message: string): ChatError {
  return {
    kind: code === "assistant_busy" || code === "assistant_unavailable" ? "busy" : "generic",
    message: message || text.generic,
  }
}
