import type { Role } from "../../generated/prisma/enums.js"

/** The identity attached to a request after the JWT has been verified. */
export interface AuthUser {
  id: string
  role: Role
}
