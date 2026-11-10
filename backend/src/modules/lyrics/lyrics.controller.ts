import { Body, Controller, Get, Param, Put, Query } from "@nestjs/common"
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
} from "@nestjs/swagger"
import { Role } from "../../generated/prisma/enums.js"
import { Auth, ThrottleGroup } from "../../shared/index.js"
import {
  LyricsDto,
  LyricsTranslationDto,
  PutLyricsDto,
  TranslationQueryDto,
} from "./dto/lyrics.dto.js"
import { LYRICS_TRANSLATE_THROTTLE } from "./lyrics.config.js"
import {
  LyricsTranslationService,
  type LyricsTranslationView,
} from "./lyrics-translation.service.js"
import { LyricsService, type LyricsView } from "./lyrics.service.js"

const NO_LYRICS = "No such track, or the track has no lyrics (code LYRICS_NOT_FOUND)"

@ApiTags("lyrics")
@Controller("tracks/:trackId/lyrics")
export class LyricsController {
  constructor(
    private readonly lyrics: LyricsService,
    private readonly translations: LyricsTranslationService,
  ) {}

  @Get()
  @Auth()
  @ApiOperation({
    summary: "Original lyrics of a track",
    description: "404 with code LYRICS_NOT_FOUND when the track exists but has no lyrics.",
  })
  @ApiOkResponse({ type: LyricsDto })
  @ApiNotFoundResponse({ description: NO_LYRICS })
  get(@Param("trackId") trackId: string): Promise<LyricsView> {
    return this.lyrics.get(trackId)
  }

  @Get("translation")
  @ThrottleGroup(LYRICS_TRANSLATE_THROTTLE) // above @Auth(): guards run bottom-up and the limit is per user
  @Auth()
  @ApiOperation({
    summary: "Lyrics translated to a language",
    description:
      "Served from the database when this version of the lyrics was already translated to that " +
      "language; otherwise translated now (DeepL) and kept. Lyrics already in that language are " +
      "returned as they are. The result has one element per original line, blank lines in place.",
  })
  @ApiOkResponse({ type: LyricsTranslationDto })
  @ApiBadRequestResponse({ description: "Language not supported (LYRICS_LANGUAGE_NOT_SUPPORTED)" })
  @ApiNotFoundResponse({ description: NO_LYRICS })
  @ApiTooManyRequestsResponse({ description: "Too many translations asked for by this user" })
  @ApiServiceUnavailableResponse({
    description: "Translation is off, busy, or the monthly allowance is (nearly) used up",
  })
  translate(
    @Param("trackId") trackId: string,
    @Query() query: TranslationQueryDto,
  ): Promise<LyricsTranslationView> {
    return this.translations.translate(trackId, query.lang)
  }

  @Put()
  @Auth(Role.ADMIN)
  @ApiOperation({
    summary: "Write the lyrics of a track (admin)",
    description:
      "Replaces the lyrics. Translations of an older text are deleted. Only text that may be " +
      "stored: your own work or a licensed source.",
  })
  @ApiOkResponse({ type: LyricsDto })
  @ApiBadRequestResponse({ description: "Empty, too long, or timings that do not match the lines" })
  @ApiNotFoundResponse({ description: "Track not found" })
  put(@Param("trackId") trackId: string, @Body() dto: PutLyricsDto): Promise<LyricsView> {
    return this.lyrics.put(trackId, dto)
  }
}
