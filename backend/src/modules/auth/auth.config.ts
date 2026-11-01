import type { ConfigService } from "@nestjs/config"
import type { ThrottlerOptions } from "@nestjs/throttler"
import { throttleGroup, type RateLimit } from "../../shared/index.js"

const DEFAULTS = {
  accessExpiresIn: "15m",
  refreshTtlDays: 30,
  credentialsLimit: 5,
  credentialsTtlSeconds: 60,
  refreshLimit: 30,
  refreshTtlSeconds: 60,
  reuseGraceSeconds: 10,
} as const

const DAY_MS = 24 * 60 * 60 * 1000

/** Names of the two rate-limit groups of this module (see `ThrottleGroup`). */
export const CREDENTIALS_THROTTLE = "credentials"
export const REFRESH_THROTTLE = "refresh"

export interface AuthConfig {
  /** Lifetime of an access token, in the `ms` format accepted by jsonwebtoken (e.g. "15m"). */
  accessExpiresIn: string
  refreshTtlMs: number
  /** Login and register: strict, because every call can be a password guess. */
  credentialsLimit: RateLimit
  /** Refresh: wider, because a healthy app refreshes on its own, one call per expired token. */
  refreshLimit: RateLimit
  /**
   * How long after a refresh the replaced token may still be presented without being treated as
   * stolen (the app was killed before it could save the new token).
   */
  refreshReuseGraceMs: number
}

/** Reads the auth-related settings; every value falls back to a safe default. */
export function readAuthConfig(config: ConfigService): AuthConfig {
  const number = (key: string, fallback: number) => Number(config.get<string>(key) ?? fallback)
  return {
    accessExpiresIn: config.get<string>("JWT_ACCESS_EXPIRES_IN") ?? DEFAULTS.accessExpiresIn,
    refreshTtlMs: number("REFRESH_TOKEN_TTL_DAYS", DEFAULTS.refreshTtlDays) * DAY_MS,
    credentialsLimit: {
      limit: number("AUTH_THROTTLE_LIMIT", DEFAULTS.credentialsLimit),
      ttlMs: number("AUTH_THROTTLE_TTL_SECONDS", DEFAULTS.credentialsTtlSeconds) * 1000,
    },
    refreshLimit: {
      limit: number("REFRESH_THROTTLE_LIMIT", DEFAULTS.refreshLimit),
      ttlMs: number("REFRESH_THROTTLE_TTL_SECONDS", DEFAULTS.refreshTtlSeconds) * 1000,
    },
    refreshReuseGraceMs: number("REFRESH_REUSE_GRACE_SECONDS", DEFAULTS.reuseGraceSeconds) * 1000,
  }
}

/** The throttlers of this module; AppModule registers them (ThrottlerModule is global). */
export function authThrottlers(config: ConfigService): ThrottlerOptions[] {
  const { credentialsLimit, refreshLimit } = readAuthConfig(config)
  return [
    throttleGroup(CREDENTIALS_THROTTLE, credentialsLimit),
    throttleGroup(REFRESH_THROTTLE, refreshLimit),
  ]
}
