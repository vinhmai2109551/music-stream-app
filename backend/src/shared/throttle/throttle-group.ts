import { applyDecorators, SetMetadata, UseGuards } from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import { ThrottlerGuard, type ThrottlerOptions } from "@nestjs/throttler"
import type { AuthUser } from "../auth/auth-user.js"

const THROTTLE_GROUP = "throttle:group"
const reflector = new Reflector()

/**
 * Puts a route in a named rate-limit group. ThrottlerModule is global, so every throttler is
 * registered once (in AppModule); each one only counts the routes of its own group, which keeps
 * a limit like login's 5 per minute from also applying to refresh.
 *
 * It is a guard, so list it ABOVE `@Auth()` when the limit is per user: guards run bottom-up and
 * the user must be known by then.
 */
export function ThrottleGroup(name: string) {
  return applyDecorators(SetMetadata(THROTTLE_GROUP, name), UseGuards(ThrottlerGuard))
}

export interface RateLimit {
  limit: number
  ttlMs: number
}

/** Settings of one throttler: it applies only to routes decorated with `@ThrottleGroup(name)`. */
export function throttleGroup(
  name: string,
  rate: RateLimit,
  options: {
    /** Count per logged-in user instead of per IP (falls back to the IP for anonymous callers). */
    perUser?: boolean
  } = {},
): ThrottlerOptions {
  return {
    name,
    limit: rate.limit,
    ttl: rate.ttlMs,
    skipIf: (context) =>
      reflector.get<string | undefined>(THROTTLE_GROUP, context.getHandler()) !== name,
    ...(options.perUser ? { getTracker: trackUserOrIp } : {}),
  }
}

function trackUserOrIp(req: Record<string, unknown>): string {
  const user = req["user"] as AuthUser | null | undefined
  if (user?.id) return `user:${user.id}`
  return typeof req["ip"] === "string" ? req["ip"] : "unknown"
}
