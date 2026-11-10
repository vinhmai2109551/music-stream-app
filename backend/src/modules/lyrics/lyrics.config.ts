import type { ConfigService } from "@nestjs/config"
import type { ThrottlerOptions } from "@nestjs/throttler"
import { throttleGroup, type RateLimit } from "../../shared/index.js"

const DEFAULTS = { throttleLimit: 10, throttleTtlSeconds: 60, stopAtPercent: 90 } as const

/** Name of the rate-limit group of `GET /tracks/:id/lyrics/translation` (see `ThrottleGroup`). */
export const LYRICS_TRANSLATE_THROTTLE = "lyrics-translate"

export interface LyricsConfig {
  /** Translations that may be asked for per user and window (a cached one costs DeepL nothing). */
  rateLimit: RateLimit
  /** From this share of the monthly allowance on, no new lyrics are translated: the rest is kept for the app's own texts. */
  stopAtPercent: number
}

export function readLyricsConfig(config: ConfigService): LyricsConfig {
  const number = (key: string, fallback: number) => Number(config.get<string>(key) ?? fallback)
  return {
    rateLimit: {
      limit: number("LYRICS_TRANSLATE_THROTTLE_LIMIT", DEFAULTS.throttleLimit),
      ttlMs: number("LYRICS_TRANSLATE_THROTTLE_TTL_SECONDS", DEFAULTS.throttleTtlSeconds) * 1000,
    },
    stopAtPercent: number("LYRICS_TRANSLATION_STOP_AT_PERCENT", DEFAULTS.stopAtPercent),
  }
}

/** The throttler of this module; AppModule registers it (ThrottlerModule is global). */
export function lyricsThrottler(config: ConfigService): ThrottlerOptions {
  return throttleGroup(LYRICS_TRANSLATE_THROTTLE, readLyricsConfig(config).rateLimit, {
    perUser: true,
  })
}
