import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from "@nestjs/common"
import { ApiOperation, ApiTags } from "@nestjs/swagger"
import { Role } from "../../generated/prisma/enums.js"
import {
  Auth,
  CurrentUser,
  OptionalAuth,
  PaginationQueryDto,
  type AuthUser,
  type Page,
} from "../../shared/index.js"
import { CreateFeedPostDto } from "./dto/feed.dto.js"
import { FeedService, type FeedPostView } from "./feed.service.js"

@ApiTags("feed")
@Controller("feed")
export class FeedController {
  constructor(private readonly feed: FeedService) {}

  @Get()
  @OptionalAuth()
  @ApiOperation({ summary: "Feed of tracks shared by artists, newest first" })
  list(
    @Query() query: PaginationQueryDto,
    @CurrentUser() user: AuthUser | null,
  ): Promise<Page<FeedPostView>> {
    return this.feed.list(query, user?.id)
  }

  @Post()
  @Auth(Role.ADMIN)
  @ApiOperation({ summary: "Publish a feed post (admin)" })
  create(@Body() dto: CreateFeedPostDto): Promise<FeedPostView> {
    return this.feed.create(dto)
  }

  @Delete(":id")
  @Auth(Role.ADMIN)
  @HttpCode(204)
  @ApiOperation({ summary: "Delete a feed post (admin)" })
  remove(@Param("id") id: string): Promise<void> {
    return this.feed.remove(id)
  }

  @Put(":id/like")
  @Auth()
  @ApiOperation({ summary: "Like a post (idempotent)" })
  async like(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser | null,
  ): Promise<{ liked: boolean }> {
    await this.feed.like(user!.id, id)
    return { liked: true }
  }

  @Delete(":id/like")
  @Auth()
  @HttpCode(200)
  @ApiOperation({ summary: "Remove my like from a post (idempotent)" })
  async unlike(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser | null,
  ): Promise<{ liked: boolean }> {
    await this.feed.unlike(user!.id, id)
    return { liked: false }
  }
}
