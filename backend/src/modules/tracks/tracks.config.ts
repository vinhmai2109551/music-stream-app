import type { ConfigService } from "@nestjs/config"
import type { ThrottlerOptions } from "@nestjs/throttler"
import { throttleGroup, type RateLimit } from "../../shared/index.js"

const DEFAULTS = {
  dedupeMinutes: 30,
  throttleLimit: 60,
  throttleTtlSeconds: 60,
} as const

const MINUTE_MS = 60_000

/** Name of the rate-limit group of `POST /tracks/:id/play` (see `ThrottleGroup`). */
export const PLAY_THROTTLE = "play"

export interface PlayConfig {
  /** A user's repeat listen of the same track inside this window is not counted again. */
  dedupeMs: number
  /** Calls to the play endpoint per user and window; a real listener sends far fewer. */
  rateLimit: RateLimit
}

export function readPlayConfig(config: ConfigService): PlayConfig {
  const number = (key: string, fallback: number) => Number(config.get<string>(key) ?? fallback)
  return {
    dedupeMs: number("PLAY_DEDUPE_MINUTES", DEFAULTS.dedupeMinutes) * MINUTE_MS,
    rateLimit: {
      limit: number("PLAY_THROTTLE_LIMIT", DEFAULTS.throttleLimit),
      ttlMs: number("PLAY_THROTTLE_TTL_SECONDS", DEFAULTS.throttleTtlSeconds) * 1000,
    },
  }
}

/** The throttler of this module; AppModule registers it (ThrottlerModule is global). */
export function playThrottler(config: ConfigService): ThrottlerOptions {
  return throttleGroup(PLAY_THROTTLE, readPlayConfig(config).rateLimit, { perUser: true })
}
