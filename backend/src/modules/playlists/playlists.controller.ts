import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from "@nestjs/common"
import { ApiOperation, ApiTags } from "@nestjs/swagger"
import {
  Auth,
  CurrentUser,
  OptionalAuth,
  PaginationQueryDto,
  type AuthUser,
  type Page,
} from "../../shared/index.js"
import { CreatePlaylistDto, UpdatePlaylistDto } from "./dto/playlist.dto.js"
import { PlaylistsService, type PlaylistDetail, type PlaylistView } from "./playlists.service.js"

@ApiTags("playlists")
@Controller("playlists")
export class PlaylistsController {
  constructor(private readonly playlists: PlaylistsService) {}

  @Get()
  @OptionalAuth()
  @ApiOperation({ summary: "Official (editorial) playlists" })
  list(
    @Query() query: PaginationQueryDto,
    @CurrentUser() user: AuthUser | null,
  ): Promise<Page<PlaylistView>> {
    return this.playlists.listOfficial(query, user?.id)
  }

  @Get("mine")
  @Auth()
  @ApiOperation({ summary: "My playlists" })
  mine(@CurrentUser() user: AuthUser | null): Promise<PlaylistView[]> {
    return this.playlists.listMine(user!.id)
  }

  @Get("liked")
  @Auth()
  @ApiOperation({ summary: "Playlists I liked" })
  liked(@CurrentUser() user: AuthUser | null): Promise<PlaylistView[]> {
    return this.playlists.listLiked(user!.id)
  }

  @Get(":id")
  @OptionalAuth()
  @ApiOperation({ summary: "Playlist with its tracks (personal playlists: owner only)" })
  get(@Param("id") id: string, @CurrentUser() user: AuthUser | null): Promise<PlaylistDetail> {
    return this.playlists.get(id, user)
  }

  @Post()
  @Auth()
  @ApiOperation({ summary: "Create a playlist" })
  create(
    @CurrentUser() user: AuthUser | null,
    @Body() dto: CreatePlaylistDto,
  ): Promise<PlaylistDetail> {
    return this.playlists.create(user!, dto)
  }

  @Patch(":id")
  @Auth()
  @ApiOperation({ summary: "Rename or re-describe a playlist (owner or admin)" })
  update(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser | null,
    @Body() dto: UpdatePlaylistDto,
  ): Promise<PlaylistDetail> {
    return this.playlists.update(id, user!, dto)
  }

  @Delete(":id")
  @Auth()
  @HttpCode(204)
  @ApiOperation({ summary: "Delete a playlist (owner or admin)" })
  remove(@Param("id") id: string, @CurrentUser() user: AuthUser | null): Promise<void> {
    return this.playlists.remove(id, user!)
  }

  @Put(":id/tracks/:trackId")
  @Auth()
  @ApiOperation({ summary: "Add a track to the end of a playlist (idempotent)" })
  addTrack(
    @Param("id") id: string,
    @Param("trackId") trackId: string,
    @CurrentUser() user: AuthUser | null,
  ): Promise<PlaylistDetail> {
    return this.playlists.addTrack(id, user!, trackId)
  }

  @Delete(":id/tracks/:trackId")
  @Auth()
  @HttpCode(200)
  @ApiOperation({ summary: "Remove a track from a playlist" })
  removeTrack(
    @Param("id") id: string,
    @Param("trackId") trackId: string,
    @CurrentUser() user: AuthUser | null,
  ): Promise<PlaylistDetail> {
    return this.playlists.removeTrack(id, user!, trackId)
  }
}
