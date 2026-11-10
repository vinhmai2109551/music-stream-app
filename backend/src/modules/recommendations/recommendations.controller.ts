import { Controller, Get, Param, Query } from "@nestjs/common"
import {
  ApiNotFoundResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from "@nestjs/swagger"
import { Auth, CurrentUser, OptionalAuth, type AuthUser } from "../../shared/index.js"
import { RecommendationQueryDto, SimilarTracksQueryDto } from "./dto/recommendation-query.dto.js"
import {
  RecommendationsService,
  type BecauseYouListenedResult,
  type ForYouResult,
  type SimilarTracksResult,
} from "./recommendations.service.js"

@ApiTags("recommendations")
@Controller()
export class RecommendationsController {
  constructor(private readonly recommendations: RecommendationsService) {}

  @Get("recommendations/for-you")
  @Auth()
  @ApiOperation({
    summary: "Tracks that fit the taste of the signed-in user",
    description:
      "Built from the vectors of the tracks the user liked (weight 3) and listened to in the last " +
      "30 days (fading), without the ones they already know, varied (MMR) and at most three per " +
      'artist. A user with no history gets the most played tracks instead (`strategy: "popular"`), ' +
      "which needs no embeddings: unlike the other two recommendation endpoints this one never answers 503.",
  })
  forYou(
    @Query() query: RecommendationQueryDto,
    @CurrentUser() user: AuthUser | null,
  ): Promise<ForYouResult> {
    return this.recommendations.forYou(user!.id, query.limit, query.region)
  }

  @Get("recommendations/because-you-listened")
  @Auth()
  @ApiOperation({
    summary: "Tracks like the one the user listened to last",
    description: "`basedOn` is null (and `items` empty) when nothing was listened to in 30 days.",
  })
  @ApiServiceUnavailableResponse({ description: "Semantic features are not configured" })
  becauseYouListened(
    @Query() query: RecommendationQueryDto,
    @CurrentUser() user: AuthUser | null,
  ): Promise<BecauseYouListenedResult> {
    return this.recommendations.becauseYouListened(user!.id, query.limit, query.region)
  }

  @Get("tracks/:id/similar")
  @OptionalAuth()
  @ApiOperation({ summary: "Tracks close to this one in style and mood" })
  @ApiNotFoundResponse({ description: "Track not found" })
  @ApiServiceUnavailableResponse({ description: "Semantic features are not configured" })
  similar(
    @Param("id") id: string,
    @Query() query: SimilarTracksQueryDto,
    @CurrentUser() user: AuthUser | null,
  ): Promise<SimilarTracksResult> {
    return this.recommendations.similar(id, query.limit, user?.id)
  }
}
