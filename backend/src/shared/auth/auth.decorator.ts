import { applyDecorators, SetMetadata, UseGuards } from "@nestjs/common"
import { ApiBearerAuth, ApiForbiddenResponse, ApiUnauthorizedResponse } from "@nestjs/swagger"
import type { Role } from "../../generated/prisma/enums.js"
import { JwtAuthGuard, OptionalJwtAuthGuard, ROLES_KEY, RolesGuard } from "./guards.js"

/** Requires a logged-in user, optionally restricted to the given roles. */
export function Auth(...roles: Role[]) {
  return applyDecorators(
    SetMetadata(ROLES_KEY, roles),
    UseGuards(JwtAuthGuard, RolesGuard),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: "Missing or invalid token" }),
    ApiForbiddenResponse({ description: "Not allowed for this role" }),
  )
}

/** Anonymous access is allowed; a valid token only adds personal data (e.g. `liked`). */
export function OptionalAuth() {
  return applyDecorators(UseGuards(OptionalJwtAuthGuard), ApiBearerAuth())
}
