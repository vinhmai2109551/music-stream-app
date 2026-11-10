import { Body, Controller, Get, HttpCode, Patch, Post } from "@nestjs/common"
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
} from "@nestjs/swagger"
import { Auth, CurrentUser, ThrottleGroup, type AuthUser } from "../../shared/index.js"
import { PresignedUploadDto, type PresignedUpload } from "../uploads/index.js"
import { PresignAvatarDto } from "./dto/presign-avatar.dto.js"
import { UpdateProfileDto } from "./dto/update-profile.dto.js"
import { AVATAR_PRESIGN_THROTTLE } from "./users.config.js"
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
  @ApiOperation({
    summary: "Update name or avatar",
    description:
      "`avatarUrl` must be the `publicUrl` of a picture this user uploaded with " +
      "`POST /users/me/avatar/presign`. The previous picture is deleted from storage.",
  })
  @ApiBadRequestResponse({ description: "avatarUrl is not one of the user's own uploads" })
  update(@CurrentUser() user: AuthUser | null, @Body() dto: UpdateProfileDto): Promise<UserView> {
    return this.users.updateProfile(user!.id, dto)
  }

  @Post("me/avatar/presign")
  @HttpCode(200)
  @ThrottleGroup(AVATAR_PRESIGN_THROTTLE)
  @ApiOperation({
    summary: "Get a presigned URL to upload a profile picture straight to Cloudflare R2",
    description:
      "Then `PUT` the raw picture to `uploadUrl` with the same `Content-Type` and body length " +
      "you declared, and send `publicUrl` to `PATCH /users/me` as `avatarUrl`. JPEG, PNG or " +
      "WebP, at most 2 MB.",
  })
  @ApiOkResponse({ type: PresignedUploadDto })
  @ApiBadRequestResponse({ description: "Type or size not allowed" })
  @ApiTooManyRequestsResponse({ description: "Too many presign calls from this user" })
  @ApiServiceUnavailableResponse({ description: "R2 is not configured on the server" })
  presignAvatar(
    @CurrentUser() user: AuthUser | null,
    @Body() dto: PresignAvatarDto,
  ): Promise<PresignedUpload> {
    return this.users.presignAvatar(user!.id, dto)
  }

  @Post("me/subscribe")
  @ApiOperation({ summary: "Activate Premium (demo, no payment)" })
  subscribe(@CurrentUser() user: AuthUser | null): Promise<UserView> {
    return this.users.subscribe(user!.id)
  }
}
