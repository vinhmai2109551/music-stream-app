import { Body, Controller, Get, Patch, Post } from "@nestjs/common"
import { ApiOperation, ApiTags } from "@nestjs/swagger"
import { Auth, CurrentUser, type AuthUser } from "../../shared/index.js"
import { UpdateProfileDto } from "./dto/update-profile.dto.js"
import { UsersService, type UserView } from "./users.service.js"

@ApiTags("users")
@Controller("users")
@Auth()
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get("me")
  @ApiOperation({ summary: "Current user profile" })
  me(@CurrentUser() user: AuthUser | null): Promise<UserView> {
    return this.users.getView(user!.id)
  }

  @Patch("me")
  @ApiOperation({ summary: "Update name or avatar" })
  update(@CurrentUser() user: AuthUser | null, @Body() dto: UpdateProfileDto): Promise<UserView> {
    return this.users.updateProfile(user!.id, dto)
  }

  @Post("me/subscribe")
  @ApiOperation({ summary: "Activate Premium (demo, no payment)" })
  subscribe(@CurrentUser() user: AuthUser | null): Promise<UserView> {
    return this.users.subscribe(user!.id)
  }
}
