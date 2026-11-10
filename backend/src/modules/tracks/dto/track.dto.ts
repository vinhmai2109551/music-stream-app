import { ApiPropertyOptional, PartialType } from "@nestjs/swagger"
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from "class-validator"
import { Region } from "../../../generated/prisma/enums.js"
import {
  DESCRIPTION_MAX_LENGTH,
  LANGUAGE_CODE,
  PaginationQueryDto,
  StringList,
} from "../../../shared/index.js"

/** A YouTube video id is exactly 11 characters: letters, digits, "-" and "_". */
export const YOUTUBE_VIDEO_ID = /^[A-Za-z0-9_-]{11}$/

export class CreateTrackDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string

  @IsString()
  artistId!: string

  @IsUrl()
  coverUrl!: string

  /** Audio file in our storage. Leave it out (or null) for a track that only plays on YouTube. */
  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsUrl()
  audioUrl?: string | null

  /** Length in seconds. */
  @IsInt()
  @Min(1)
  durationSec!: number

  /** Official YouTube video to play this track from; `null` removes it. */
  @ApiPropertyOptional({ nullable: true, pattern: YOUTUBE_VIDEO_ID.source, example: "AbC123-_xyZ" })
  @IsOptional()
  @Matches(YOUTUBE_VIDEO_ID, { message: "youtubeVideoId must be an 11-character YouTube video id" })
  youtubeVideoId?: string | null

  /** Music genres, e.g. `v-pop`, `ballad` (at most 10, each at most 40 characters). */
  @StringList()
  genres?: string[]

  /** Moods, e.g. `buồn`, `sôi động`. */
  @StringList()
  mood?: string[]

  /** Situations, instruments, themes, e.g. `ngày mưa`, `gym`, `piano`. */
  @StringList()
  tags?: string[]

  /** What the song is like, in a sentence or two. Never its lyrics. */
  @IsOptional()
  @IsString()
  @MaxLength(DESCRIPTION_MAX_LENGTH)
  description?: string

  /** Language of the vocals (ISO 639 code); `null` = instrumental or unknown. */
  @ApiPropertyOptional({ nullable: true, pattern: LANGUAGE_CODE.source, example: "vi" })
  @IsOptional()
  @Matches(LANGUAGE_CODE, { message: "language must be a 2-3 letter lower case language code" })
  language?: string | null
}

export class UpdateTrackDto extends PartialType(CreateTrackDto) {}

export class ListTracksQueryDto extends PaginationQueryDto {
  /** Only tracks of this artist. */
  @IsOptional()
  @IsString()
  artistId?: string

  /** Only tracks whose artist comes from this region. */
  @IsOptional()
  @IsEnum(Region)
  region?: Region
}
