import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from "@nestjs/common"
import { ApiNotFoundResponse, ApiOperation, ApiTags } from "@nestjs/swagger"
import {
  Auth,
  CurrentUser,
  CursorQueryDto,
  OptionalAuth,
  type AuthUser,
  type CursorPage,
} from "../../shared/index.js"
import { CommentsService, type CommentPage, type CommentView } from "./comments.service.js"
import { CreateCommentDto, ListCommentsQueryDto } from "./dto/comment.dto.js"

@ApiTags("comments")
@Controller("comments")
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Get()
  @OptionalAuth()
  @ApiOperation({
    summary: "Comments of a track (?trackId=) or a feed post (?postId=)",
    description:
      "Top-level comments, newest first, one page at a time: pass the previous nextCursor as " +
      "?cursor= (limit defaults to 20, max 50); total counts every comment, replies included. " +
      "Each comes with its 3 newest replies " +
      "(oldest first) and repliesCount; load the rest with GET /comments/:id/replies.",
  })
  list(
    @Query() query: ListCommentsQueryDto,
    @CurrentUser() user: AuthUser | null,
  ): Promise<CommentPage> {
    return this.comments.list(query, user?.id)
  }

  @Get(":id/replies")
  @OptionalAuth()
  @ApiOperation({
    summary: "Replies of a comment, newest first",
    description:
      "One page at a time. To get the replies older than the ones you show, pass the id of the " +
      "oldest one as ?cursor=; after that use nextCursor.",
  })
  @ApiNotFoundResponse({ description: "Comment not found" })
  replies(
    @Param("id") id: string,
    @Query() query: CursorQueryDto,
    @CurrentUser() user: AuthUser | null,
  ): Promise<CursorPage<CommentView>> {
    return this.comments.listReplies(id, query, user?.id)
  }

  @Post()
  @Auth()
  @ApiOperation({
    summary: "Write a comment or a reply (set parentId)",
    description:
      "Replies are one level deep: answering a reply attaches the new comment to the " +
      "top-level comment of that reply.",
  })
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
