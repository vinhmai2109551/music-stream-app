import { createParamDecorator, ExecutionContext } from "@nestjs/common"
import type { Request } from "express"
import type { AuthUser } from "./auth-user.js"

/** Injects the authenticated user. With OptionalAuth() it is `null` for anonymous requests. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser | null => {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser | null }>()
    return request.user ?? null
  },
)
