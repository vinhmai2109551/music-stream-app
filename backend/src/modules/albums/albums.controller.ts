import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from "@nestjs/common"
import { ApiOperation, ApiTags } from "@nestjs/swagger"
import { Role } from "../../generated/prisma/enums.js"
import { Auth, CurrentUser, OptionalAuth, type AuthUser, type Page } from "../../shared/index.js"
import { AlbumsService, type AlbumDetail, type AlbumView } from "./albums.service.js"
import { CreateAlbumDto, ListAlbumsQueryDto, UpdateAlbumDto } from "./dto/album.dto.js"

@ApiTags("albums")
@Controller("albums")
export class AlbumsController {
  constructor(private readonly albums: AlbumsService) {}

  @Get()
  @OptionalAuth()
  @ApiOperation({ summary: "List albums (filter with ?q= and ?artistId=)" })
  list(
    @Query() query: ListAlbumsQueryDto,
    @CurrentUser() user: AuthUser | null,
  ): Promise<Page<AlbumView>> {
    return this.albums.list(query, user?.id)
  }

  @Get("liked")
  @Auth()
  @ApiOperation({ summary: "Albums I saved" })
  liked(@CurrentUser() user: AuthUser | null): Promise<AlbumView[]> {
    return this.albums.listLiked(user!.id)
  }

  @Get(":id")
  @OptionalAuth()
  @ApiOperation({ summary: "Album with its tracks" })
  get(@Param("id") id: string, @CurrentUser() user: AuthUser | null): Promise<AlbumDetail> {
    return this.albums.get(id, user?.id)
  }

  @Post()
  @Auth(Role.ADMIN)
  @ApiOperation({ summary: "Create an album (admin)" })
  create(@Body() dto: CreateAlbumDto): Promise<AlbumDetail> {
    return this.albums.create(dto)
  }

  @Patch(":id")
  @Auth(Role.ADMIN)
  @ApiOperation({ summary: "Update an album; sending trackIds replaces its track list (admin)" })
  update(@Param("id") id: string, @Body() dto: UpdateAlbumDto): Promise<AlbumDetail> {
    return this.albums.update(id, dto)
  }

  @Delete(":id")
  @Auth(Role.ADMIN)
  @HttpCode(204)
  @ApiOperation({ summary: "Delete an album (admin)" })
  remove(@Param("id") id: string): Promise<void> {
    return this.albums.remove(id)
  }
}
