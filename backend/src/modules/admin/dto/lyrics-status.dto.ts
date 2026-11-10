import { ApiProperty } from "@nestjs/swagger"
import { Transform } from "class-transformer"
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsString,
  MaxLength,
} from "class-validator"
import { LYRICS_STATUS_MAX_IDS } from "../admin.config.js"

export class LyricsStatusQueryDto {
  /** Track ids, separated by commas (`?ids=a,b,c`), at most 100. */
  @ApiProperty({ type: String, example: "clx1abc,clx2def" })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.split(",").filter((id) => id.length > 0) : value,
  )
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(LYRICS_STATUS_MAX_IDS)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  ids!: string[]
}

export class LyricsStatusDto {
  @ApiProperty({ description: "The track has lyrics." }) hasLyrics!: boolean

  @ApiProperty({ description: "The lyrics have a start time for every line." })
  hasTimings!: boolean
}
