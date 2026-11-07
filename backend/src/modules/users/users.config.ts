import type { ConfigService } from "@nestjs/config"
import type { ThrottlerOptions } from "@nestjs/throttler"
import { throttleGroup, type RateLimit } from "../../shared/index.js"

const DEFAULTS = { throttleLimit: 10, throttleTtlSeconds: 60 } as const

/** Name of the rate-limit group of `POST /users/me/avatar/presign` (see `ThrottleGroup`). */
export const AVATAR_PRESIGN_THROTTLE = "avatar-presign"

/** Presigned URLs per user and window: changing a picture a few times is normal, hundreds is not. */
export function readAvatarRateLimit(config: ConfigService): RateLimit {
  const number = (key: string, fallback: number) => Number(config.get<string>(key) ?? fallback)
  return {
    limit: number("AVATAR_THROTTLE_LIMIT", DEFAULTS.throttleLimit),
    ttlMs: number("AVATAR_THROTTLE_TTL_SECONDS", DEFAULTS.throttleTtlSeconds) * 1000,
  }
}

/** The throttler of this module; AppModule registers it (ThrottlerModule is global). */
export function avatarThrottler(config: ConfigService): ThrottlerOptions {
  return throttleGroup(AVATAR_PRESIGN_THROTTLE, readAvatarRateLimit(config), { perUser: true })
}
