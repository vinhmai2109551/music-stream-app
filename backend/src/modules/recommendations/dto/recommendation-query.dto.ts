import { Type } from "class-transformer"
import { IsEnum, IsInt, IsOptional, Max, Min } from "class-validator"
import { Region } from "../../../generated/prisma/enums.js"

export class RecommendationQueryDto {
  /** Only tracks of artists from this region. */
  @IsOptional()
  @IsEnum(Region)
  region?: Region

  /** How many tracks (1 to 20, default 10). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit: number = 10
}

/** The query of `GET /tracks/:id/similar`: there is no region, a similar track is similar anywhere. */
export class SimilarTracksQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit: number = 10
}
