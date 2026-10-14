import { Controller, Delete, HttpCode, Param, ParseEnumPipe, Put } from "@nestjs/common"
import { ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger"
import { Auth, CurrentUser, type AuthUser } from "../../shared/index.js"
import { LikeKind, LikesService } from "./likes.service.js"

@ApiTags("likes")
@Controller("likes")
@Auth()
export class LikesController {
  constructor(private readonly likes: LikesService) {}

  @Put(":kind/:id")
  @ApiOperation({ summary: "Like a track, album or playlist (idempotent)" })
  @ApiParam({ name: "kind", enum: LikeKind })
  async like(
    @CurrentUser() user: AuthUser | null,
    @Param("kind", new ParseEnumPipe(LikeKind)) kind: LikeKind,
    @Param("id") id: string,
  ): Promise<{ liked: boolean }> {
    await this.likes.like(kind, user!.id, id)
    return { liked: true }
  }

  @Delete(":kind/:id")
  @HttpCode(200)
  @ApiOperation({ summary: "Remove a like (idempotent)" })
  @ApiParam({ name: "kind", enum: LikeKind })
  async unlike(
    @CurrentUser() user: AuthUser | null,
    @Param("kind", new ParseEnumPipe(LikeKind)) kind: LikeKind,
    @Param("id") id: string,
  ): Promise<{ liked: boolean }> {
    await this.likes.unlike(kind, user!.id, id)
    return { liked: false }
  }
}
