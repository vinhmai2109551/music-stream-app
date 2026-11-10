import { Transform, Type } from "class-transformer"
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator"
import { Region } from "../../../generated/prisma/enums.js"

export const SEMANTIC_TYPES = ["track", "artist"] as const
export type SemanticType = (typeof SEMANTIC_TYPES)[number]

export class SemanticSearchQueryDto {
  /** What to look for, in words: a name, a mood ("nhạc buồn ngày mưa") or an occasion ("gym K-Pop"). */
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  q!: string

  /** `track` (default) or `artist`. */
  @IsOptional()
  @IsIn(SEMANTIC_TYPES)
  type: SemanticType = "track"

  /** Only results from this region. */
  @IsOptional()
  @IsEnum(Region)
  region?: Region

  /** How many results (1 to 20, default 10). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit: number = 10
}
