import { Type } from "class-transformer"
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator"

export class PaginationQueryDto {
  /** 1-based page number. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1

  /** Items per page (max 100). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20

  /** Free-text search. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string
}
