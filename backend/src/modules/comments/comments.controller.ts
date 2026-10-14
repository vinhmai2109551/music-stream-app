import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from "@nestjs/common"
import { ApiOperation, ApiTags } from "@nestjs/swagger"
import { Auth, CurrentUser, OptionalAuth, type AuthUser } from "../../shared/index.js"
import { CommentsService, type CommentView } from "./comments.service.js"
import { CreateCommentDto, ListCommentsQueryDto } from "./dto/comment.dto.js"

@ApiTags("comments")
@Controller("comments")
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Get()
  @OptionalAuth()
  @ApiOperation({ summary: "Comments of a track (?trackId=) or a feed post (?postId=)" })
  list(
    @Query() query: ListCommentsQueryDto,
    @CurrentUser() user: AuthUser | null,
  ): Promise<CommentView[]> {
    return this.comments.list(query, user?.id)
  }

  @Post()
  @Auth()
  @ApiOperation({ summary: "Write a comment or a reply (set parentId)" })
  create(
    @CurrentUser() user: AuthUser | null,
    @Body() dto: CreateCommentDto,
  ): Promise<CommentView> {
    return this.comments.create(user!.id, dto)
  }

  @Delete(":id")
  @Auth()
  @HttpCode(204)
  @ApiOperation({ summary: "Delete my comment (admins can delete any)" })
  remove(@Param("id") id: string, @CurrentUser() user: AuthUser | null): Promise<void> {
    return this.comments.remove(id, user!)
  }

  @Put(":id/like")
  @Auth()
  @ApiOperation({ summary: "Like a comment (idempotent)" })
  async like(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser | null,
  ): Promise<{ liked: boolean }> {
    await this.comments.like(user!.id, id)
    return { liked: true }
  }

  @Delete(":id/like")
  @Auth()
  @HttpCode(200)
  @ApiOperation({ summary: "Remove my like from a comment (idempotent)" })
  async unlike(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser | null,
  ): Promise<{ liked: boolean }> {
    await this.comments.unlike(user!.id, id)
    return { liked: false }
  }
}
