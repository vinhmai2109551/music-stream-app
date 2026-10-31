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
import { PaginationQueryDto } from "../../../shared/index.js"

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

  @IsUrl()
  audioUrl!: string

  /** Length in seconds. */
  @IsInt()
  @Min(1)
  durationSec!: number

  /** Official YouTube video to play this track from; `null` removes it. */
  @ApiPropertyOptional({ nullable: true, pattern: YOUTUBE_VIDEO_ID.source, example: "AbC123-_xyZ" })
  @IsOptional()
  @Matches(YOUTUBE_VIDEO_ID, { message: "youtubeVideoId must be an 11-character YouTube video id" })
  youtubeVideoId?: string | null
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
