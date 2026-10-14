import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from "@nestjs/common"
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
import { ArtistsService, type ArtistView } from "./artists.service.js"
import { CreateArtistDto, UpdateArtistDto } from "./dto/artist.dto.js"

@ApiTags("artists")
@Controller("artists")
export class ArtistsController {
  constructor(private readonly artists: ArtistsService) {}

  @Get()
  @OptionalAuth()
  @ApiOperation({ summary: "List artists (search with ?q=)" })
  list(
    @Query() query: PaginationQueryDto,
    @CurrentUser() user: AuthUser | null,
  ): Promise<Page<ArtistView>> {
    return this.artists.list(query, user?.id)
  }

  @Get("followed")
  @Auth()
  @ApiOperation({ summary: "Artists I follow" })
  followed(@CurrentUser() user: AuthUser | null): Promise<ArtistView[]> {
    return this.artists.listFollowed(user!.id)
  }

  @Get(":id")
  @OptionalAuth()
  @ApiOperation({ summary: "Artist details" })
  get(@Param("id") id: string, @CurrentUser() user: AuthUser | null): Promise<ArtistView> {
    return this.artists.get(id, user?.id)
  }

  @Post()
  @Auth(Role.ADMIN)
  @ApiOperation({ summary: "Create an artist (admin)" })
  async create(@Body() dto: CreateArtistDto): Promise<ArtistView> {
    const artist = await this.artists.create(dto)
    return this.artists.get(artist.id)
  }

  @Patch(":id")
  @Auth(Role.ADMIN)
  @ApiOperation({ summary: "Update an artist (admin)" })
  async update(@Param("id") id: string, @Body() dto: UpdateArtistDto): Promise<ArtistView> {
    await this.artists.update(id, dto)
    return this.artists.get(id)
  }

  @Delete(":id")
  @Auth(Role.ADMIN)
  @HttpCode(204)
  @ApiOperation({ summary: "Delete an artist and everything that belongs to it (admin)" })
  remove(@Param("id") id: string): Promise<void> {
    return this.artists.remove(id)
  }
}
