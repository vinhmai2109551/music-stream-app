import { BadRequestException, Inject, Injectable } from "@nestjs/common"
import { Role } from "../../generated/prisma/enums.js"
import type { Page } from "../../shared/index.js"
import type { AdminUserFilter, AdminUserView } from "../users/index.js"
import type { UpdateUserAccessDto } from "./dto/admin-users.dto.js"
import {
  SESSION_CONTROL,
  USER_ADMINISTRATION,
  type SessionControl,
  type UserAdministration,
} from "./ports.js"

/**
 * What an administrator may do to accounts. The rules are here (an admin cannot lock themselves
 * out); the users module only keeps the data.
 */
@Injectable()
export class AdminUsersService {
  constructor(
    @Inject(USER_ADMINISTRATION) private readonly users: UserAdministration,
    @Inject(SESSION_CONTROL) private readonly sessions: SessionControl,
  ) {}

  list(filter: AdminUserFilter): Promise<Page<AdminUserView>> {
    return this.users.listForAdmin(filter)
  }

  async update(
    actorId: string,
    targetId: string,
    change: UpdateUserAccessDto,
  ): Promise<AdminUserView> {
    if (change.role === undefined && change.isBanned === undefined) {
      throw new BadRequestException("Nothing to change: send role and/or isBanned")
    }
    if (actorId === targetId) {
      if (change.isBanned === true) throw new BadRequestException("You cannot ban your own account")
      if (change.role !== undefined && change.role !== Role.ADMIN) {
        throw new BadRequestException("You cannot remove your own admin role")
      }
    }

    const updated = await this.users.changeAccess(targetId, change)
    // A ban must end the sessions that are open, not only block the next login.
    if (change.isBanned === true) await this.sessions.revokeAllSessions(targetId)
    return updated
  }

  async remove(actorId: string, targetId: string): Promise<void> {
    if (actorId === targetId) throw new BadRequestException("You cannot delete your own account")
    await this.users.remove(targetId)
  }
}
