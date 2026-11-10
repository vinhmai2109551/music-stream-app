import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Query } from "@nestjs/common"
import {
  ApiBadRequestResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger"
import { Role } from "../../generated/prisma/enums.js"
import { Auth, CurrentUser, type AuthUser, type Page } from "../../shared/index.js"
import type { AdminUserView } from "../users/index.js"
import { AdminUsersService } from "./admin-users.service.js"
import {
  AdminUserDto,
  AdminUserPageDto,
  AdminUsersQueryDto,
  UpdateUserAccessDto,
} from "./dto/admin-users.dto.js"

@ApiTags("admin")
@Controller("admin/users")
@Auth(Role.ADMIN)
export class AdminUsersController {
  constructor(private readonly users: AdminUsersService) {}

  @Get()
  @ApiOperation({
    summary: "List users (admin)",
    description: "Search with ?q= (email or name); filter with ?role= and ?banned=. Newest first.",
  })
  @ApiOkResponse({ type: AdminUserPageDto })
  list(@Query() query: AdminUsersQueryDto): Promise<Page<AdminUserView>> {
    return this.users.list(query)
  }

  @Patch(":id")
  @ApiOperation({
    summary: "Change the role of a user, or ban / unban them (admin)",
    description: "Banning also ends every session of the user. You cannot ban or demote yourself.",
  })
  @ApiOkResponse({ type: AdminUserDto })
  @ApiBadRequestResponse({ description: "Nothing to change, or an attempt on your own account" })
  @ApiNotFoundResponse({ description: "User not found" })
  update(
    @Param("id") id: string,
    @Body() dto: UpdateUserAccessDto,
    @CurrentUser() actor: AuthUser | null,
  ): Promise<AdminUserView> {
    return this.users.update(actor!.id, id, dto)
  }

  @Delete(":id")
  @HttpCode(204)
  @ApiOperation({ summary: "Delete a user and everything that belongs to them (admin)" })
  @ApiNoContentResponse({ description: "The user is deleted" })
  @ApiBadRequestResponse({ description: "You cannot delete your own account" })
  @ApiNotFoundResponse({ description: "User not found" })
  remove(@Param("id") id: string, @CurrentUser() actor: AuthUser | null): Promise<void> {
    return this.users.remove(actor!.id, id)
  }
}
