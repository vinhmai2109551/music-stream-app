import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator"
import { APP_LANGUAGES } from "../../translation/index.js"
import { MAX_LINES, MAX_TOTAL_CHARACTERS } from "../lyrics-text.js"

export class PutLyricsDto {
  @ApiProperty({ enum: APP_LANGUAGES, description: "Language of the lines." })
  @IsIn([...APP_LANGUAGES])
  language!: string

  @ApiProperty({
    type: [String],
    description:
      "One element per line; a blank line is an empty string. A line break inside an element " +
      "starts a new line. Only text that may be stored (own work or licensed).",
  })
  @IsArray()
  @ArrayMaxSize(MAX_LINES)
  @IsString({ each: true })
  @MaxLength(MAX_TOTAL_CHARACTERS, { each: true })
  lines!: string[]

  @ApiPropertyOptional({
    type: [Number],
    description: "Start of each line in milliseconds; same length as the lines.",
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_LINES)
  @IsInt({ each: true })
  @Min(0, { each: true })
  timingsMs?: number[]

  @ApiProperty({
    example: "demo",
    description: 'Where the text comes from: "demo", "manual" or a provider.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  source!: string
}

export class TranslationQueryDto {
  @ApiProperty({ enum: APP_LANGUAGES, description: "Language to translate to." })
  @IsString()
  @IsNotEmpty()
  lang!: string
}

export class LyricsDto {
  @ApiProperty() trackId!: string

  @ApiProperty({ enum: APP_LANGUAGES }) language!: string

  @ApiProperty({ type: [String], description: "One element per line; a blank line is empty." })
  lines!: string[]

  @ApiProperty({
    type: [Number],
    nullable: true,
    description: "Start of each line in ms, or null.",
  })
  timingsMs!: number[] | null

  @ApiProperty({ description: 'Where the text comes from ("demo", "manual" or a provider).' })
  source!: string

  @ApiProperty() updatedAt!: string
}

export class LyricsTranslationDto {
  @ApiProperty() trackId!: string

  @ApiProperty({ enum: APP_LANGUAGES }) sourceLanguage!: string

  @ApiProperty({ enum: APP_LANGUAGES }) targetLanguage!: string

  @ApiProperty({ type: [String], description: "Same number of elements as the original lines." })
  lines!: string[]

  @ApiProperty({ description: '"deepl", or "original" when no translation was needed.' })
  provider!: string

  @ApiProperty({ description: "True when this request did not make the translation." })
  cached!: boolean

  @ApiProperty({ nullable: true, type: String }) translatedAt!: string | null
}
