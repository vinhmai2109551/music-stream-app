import type { ConfigService } from "@nestjs/config"
import type { ThrottlerOptions } from "@nestjs/throttler"
import { throttleGroup, type RateLimit } from "../../shared/index.js"

const DEFAULTS = { throttleLimit: 12, throttleTtlSeconds: 60 } as const

/** Name of the rate-limit group of `POST /ai/conversations/:id/messages` (see `ThrottleGroup`). */
export const AI_CHAT_THROTTLE = "ai-chat"

/** Messages per user and window: a few in a row are normal, a loop is not. */
export function readAiChatRateLimit(config: ConfigService): RateLimit {
  const number = (key: string, fallback: number) => Number(config.get<string>(key) ?? fallback)
  return {
    limit: number("AI_CHAT_THROTTLE_LIMIT", DEFAULTS.throttleLimit),
    ttlMs: number("AI_CHAT_THROTTLE_TTL_SECONDS", DEFAULTS.throttleTtlSeconds) * 1000,
  }
}

/** The throttler of this module; AppModule registers it (ThrottlerModule is global). */
export function aiChatThrottler(config: ConfigService): ThrottlerOptions {
  return throttleGroup(AI_CHAT_THROTTLE, readAiChatRateLimit(config), { perUser: true })
}
