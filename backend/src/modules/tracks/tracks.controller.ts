import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from "@nestjs/common"
import { ApiOperation, ApiTags } from "@nestjs/swagger"
import { Role } from "../../generated/prisma/enums.js"
import { Auth, CurrentUser, OptionalAuth, type AuthUser, type Page } from "../../shared/index.js"
import { CreateTrackDto, ListTracksQueryDto, UpdateTrackDto } from "./dto/track.dto.js"
import { TracksService, type TrackView } from "./tracks.service.js"

@ApiTags("tracks")
@Controller("tracks")
export class TracksController {
  constructor(private readonly tracks: TracksService) {}

  @Get()
  @OptionalAuth()
  @ApiOperation({ summary: "List tracks (filter with ?q= and ?artistId=)" })
  list(
    @Query() query: ListTracksQueryDto,
    @CurrentUser() user: AuthUser | null,
  ): Promise<Page<TrackView>> {
    return this.tracks.list(query, user?.id)
  }

  @Get("liked")
  @Auth()
  @ApiOperation({ summary: "Tracks I liked" })
  liked(@CurrentUser() user: AuthUser | null): Promise<TrackView[]> {
    return this.tracks.listLiked(user!.id)
  }

  @Get(":id")
  @OptionalAuth()
  @ApiOperation({ summary: "Track details" })
  get(@Param("id") id: string, @CurrentUser() user: AuthUser | null): Promise<TrackView> {
    return this.tracks.get(id, user?.id)
  }

  @Post(":id/play")
  @HttpCode(200)
  @ApiOperation({ summary: "Count one play" })
  play(@Param("id") id: string): Promise<{ plays: number }> {
    return this.tracks.recordPlay(id)
  }

  @Post()
  @Auth(Role.ADMIN)
  @ApiOperation({ summary: "Create a track (admin)" })
  create(@Body() dto: CreateTrackDto): Promise<TrackView> {
    return this.tracks.create(dto)
  }

  @Patch(":id")
  @Auth(Role.ADMIN)
  @ApiOperation({ summary: "Update a track (admin)" })
  update(@Param("id") id: string, @Body() dto: UpdateTrackDto): Promise<TrackView> {
    return this.tracks.update(id, dto)
  }

  @Delete(":id")
  @Auth(Role.ADMIN)
  @HttpCode(204)
  @ApiOperation({ summary: "Delete a track (admin)" })
  remove(@Param("id") id: string): Promise<void> {
    return this.tracks.remove(id)
  }
}
