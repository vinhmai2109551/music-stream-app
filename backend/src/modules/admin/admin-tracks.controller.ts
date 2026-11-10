import { Controller, Get, Query } from "@nestjs/common"
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  getSchemaPath,
} from "@nestjs/swagger"
import { Role } from "../../generated/prisma/enums.js"
import { Auth } from "../../shared/index.js"
import type { LyricsStatus } from "../lyrics/index.js"
import { AdminTracksService } from "./admin-tracks.service.js"
import { LyricsStatusDto, LyricsStatusQueryDto } from "./dto/lyrics-status.dto.js"

@ApiTags("admin")
@Controller("admin/tracks")
@Auth(Role.ADMIN)
@ApiExtraModels(LyricsStatusDto)
export class AdminTracksController {
  constructor(private readonly tracks: AdminTracksService) {}

  @Get("lyrics-status")
  @ApiOperation({
    summary: "Which of these tracks have lyrics, and timed ones (admin)",
    description: "One call for a whole page of the tracks table; the answer has an entry per id.",
  })
  @ApiOkResponse({
    schema: { type: "object", additionalProperties: { $ref: getSchemaPath(LyricsStatusDto) } },
  })
  lyricsStatus(@Query() query: LyricsStatusQueryDto): Promise<Record<string, LyricsStatus>> {
    return this.tracks.lyricsStatus(query.ids)
  }
}
