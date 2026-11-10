import type { ConfigService } from "@nestjs/config"
import type { ThrottlerOptions } from "@nestjs/throttler"
import { throttleGroup, type RateLimit } from "../../shared/index.js"

const DEFAULTS = { throttleLimit: 30, throttleTtlSeconds: 60 } as const

/** Name of the rate-limit group of `GET /search/semantic` (see `ThrottleGroup`). */
export const SEMANTIC_SEARCH_THROTTLE = "semantic-search"

/**
 * Searches per user and window. Every search that is not repeated costs a call to the embedding
 * service, so the limit is lower than for plain reads; typing a few searches in a row is fine.
 */
export function readSemanticSearchRateLimit(config: ConfigService): RateLimit {
  const number = (key: string, fallback: number) => Number(config.get<string>(key) ?? fallback)
  return {
    limit: number("SEMANTIC_SEARCH_THROTTLE_LIMIT", DEFAULTS.throttleLimit),
    ttlMs: number("SEMANTIC_SEARCH_THROTTLE_TTL_SECONDS", DEFAULTS.throttleTtlSeconds) * 1000,
  }
}

/** The throttler of this module; AppModule registers it (ThrottlerModule is global). */
export function semanticSearchThrottler(config: ConfigService): ThrottlerOptions {
  return throttleGroup(SEMANTIC_SEARCH_THROTTLE, readSemanticSearchRateLimit(config), {
    perUser: true,
  })
}
