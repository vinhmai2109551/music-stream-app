import { Controller, Delete, HttpCode, Param, Put } from "@nestjs/common"
import { ApiOperation, ApiTags } from "@nestjs/swagger"
import { Auth, CurrentUser, type AuthUser } from "../../shared/index.js"
import { FollowsService } from "./follows.service.js"

@ApiTags("follows")
@Controller("follows")
@Auth()
export class FollowsController {
  constructor(private readonly follows: FollowsService) {}

  @Put("artists/:artistId")
  @ApiOperation({ summary: "Follow an artist (idempotent)" })
  async follow(
    @CurrentUser() user: AuthUser | null,
    @Param("artistId") artistId: string,
  ): Promise<{ following: boolean }> {
    await this.follows.follow(user!.id, artistId)
    return { following: true }
  }

  @Delete("artists/:artistId")
  @HttpCode(200)
  @ApiOperation({ summary: "Unfollow an artist (idempotent)" })
  async unfollow(
    @CurrentUser() user: AuthUser | null,
    @Param("artistId") artistId: string,
  ): Promise<{ following: boolean }> {
    await this.follows.unfollow(user!.id, artistId)
    return { following: false }
  }
}
