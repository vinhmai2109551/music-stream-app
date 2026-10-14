import { PartialType } from "@nestjs/swagger"
import { IsInt, IsOptional, IsString, IsUrl, MaxLength, Min, MinLength } from "class-validator"
import { PaginationQueryDto } from "../../../shared/index.js"

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
}

export class UpdateTrackDto extends PartialType(CreateTrackDto) {}

export class ListTracksQueryDto extends PaginationQueryDto {
  /** Only tracks of this artist. */
  @IsOptional()
  @IsString()
  artistId?: string
}
