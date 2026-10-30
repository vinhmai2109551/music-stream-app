import type { ConfigService } from "@nestjs/config"

const DEFAULTS = {
  accessExpiresIn: "15m",
  refreshTtlDays: 30,
  throttleLimit: 5,
  throttleTtlSeconds: 60,
} as const

const DAY_MS = 24 * 60 * 60 * 1000

export interface AuthConfig {
  /** Lifetime of an access token, in the `ms` format accepted by jsonwebtoken (e.g. "15m"). */
  accessExpiresIn: string
  refreshTtlMs: number
  /** Max login / register / refresh calls per IP per window. */
  throttleLimit: number
  throttleTtlMs: number
}

/** Reads the auth-related settings; every value falls back to a safe default. */
export function readAuthConfig(config: ConfigService): AuthConfig {
  const number = (key: string, fallback: number) => Number(config.get<string>(key) ?? fallback)
  return {
    accessExpiresIn: config.get<string>("JWT_ACCESS_EXPIRES_IN") ?? DEFAULTS.accessExpiresIn,
    refreshTtlMs: number("REFRESH_TOKEN_TTL_DAYS", DEFAULTS.refreshTtlDays) * DAY_MS,
    throttleLimit: number("AUTH_THROTTLE_LIMIT", DEFAULTS.throttleLimit),
    throttleTtlMs: number("AUTH_THROTTLE_TTL_SECONDS", DEFAULTS.throttleTtlSeconds) * 1000,
  }
}
