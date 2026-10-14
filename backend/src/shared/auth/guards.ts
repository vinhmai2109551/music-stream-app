import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import { AuthGuard } from "@nestjs/passport"
import type { Role } from "../../generated/prisma/enums.js"
import type { AuthUser } from "./auth-user.js"

export const ROLES_KEY = "roles"

/** Requires a valid Bearer token. The "jwt" strategy is registered by the auth module. */
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {}

/** Lets anonymous requests through (user = null) but still reads a valid token. */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard("jwt") {
  handleRequest<TUser = AuthUser>(_error: unknown, user: TUser | false): TUser | null {
    return user || null
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!roles || roles.length === 0) return true
    const request = context.switchToHttp().getRequest<{ user?: AuthUser | null }>()
    return !!request.user && roles.includes(request.user.role)
  }
}
