import { ApiError } from "@/api/client"
import type { TranslationKey } from "@/i18n"

/** Why a lyrics request failed, as far as the screen needs to tell the cases apart. */
export type LyricsFailure =
  | "none" // the track has no lyrics
  | "quota" // the monthly translation allowance is used up (or nearly)
  | "not-configured" // the server has no translator: the button is not offered again
  | "rate-limited"
  | "offline"
  | "busy"
  | "generic"

function codeOf(error: ApiError): string | undefined {
  const details = error.details
  if (typeof details !== "object" || details === null || !("code" in details)) return undefined
  return typeof details.code === "string" ? details.code : undefined
}

export function lyricsFailure(error: unknown): LyricsFailure {
  if (!(error instanceof ApiError)) return "generic"
  if (error.kind !== "http") return "offline"
  if (error.status === 404) return "none"
  if (error.status === 429) return "rate-limited"
  if (error.status === 503) {
    switch (codeOf(error)) {
      case "TRANSLATION_QUOTA_EXCEEDED":
        return "quota"
      case "TRANSLATION_NOT_CONFIGURED":
        return "not-configured"
      default:
        return "busy"
    }
  }
  return "generic"
}

export const TRANSLATION_FAILURE_TEXT: Record<LyricsFailure, TranslationKey> = {
  none: "lyrics.translationFailed.generic",
  quota: "lyrics.translationFailed.quota",
  "not-configured": "lyrics.translationFailed.notConfigured",
  "rate-limited": "lyrics.translationFailed.rateLimited",
  offline: "lyrics.translationFailed.offline",
  busy: "lyrics.translationFailed.busy",
  generic: "lyrics.translationFailed.generic",
}

/** Trying again can help only when the cause is not a limit that stays. */
export const canRetry = (failure: LyricsFailure): boolean =>
  failure !== "quota" && failure !== "not-configured"
