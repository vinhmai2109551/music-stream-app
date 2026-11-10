import { Controller, Get, Query } from "@nestjs/common"
import {
  ApiBadRequestResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
} from "@nestjs/swagger"
import { Auth, CurrentUser, ThrottleGroup, type AuthUser } from "../../shared/index.js"
import { SemanticSearchQueryDto } from "./dto/semantic-search.dto.js"
import { SEMANTIC_SEARCH_THROTTLE } from "./search.config.js"
import { SearchService, type SemanticSearchResult } from "./search.service.js"

@ApiTags("search")
@Controller("search")
@Auth()
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get("semantic")
  @ThrottleGroup(SEMANTIC_SEARCH_THROTTLE)
  @ApiOperation({
    summary: "Search tracks or artists by meaning and by words",
    description:
      "Finds the nearest items to the meaning of `q` (embeddings) and the items whose name matches " +
      "its words (accents and case ignored), and merges the two lists with Reciprocal Rank Fusion " +
      "(k = 60). Each result carries its `score` and which lists it came from. Answers 503 while " +
      "semantic features are not configured.",
  })
  @ApiBadRequestResponse({ description: "q is missing, or limit / type / region is not valid" })
  @ApiTooManyRequestsResponse({ description: "Too many searches from this user" })
  @ApiServiceUnavailableResponse({ description: "Semantic features are off or unavailable" })
  semantic(
    @Query() query: SemanticSearchQueryDto,
    @CurrentUser() user: AuthUser | null,
  ): Promise<SemanticSearchResult> {
    return this.search.semantic(query, user!.id)
  }
}
