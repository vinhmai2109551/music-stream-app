import { Module } from "@nestjs/common"
import { EmbeddingsModule } from "../embeddings/index.js"
import { LikesModule } from "../likes/index.js"
import { TracksModule } from "../tracks/index.js"
import { RecommendationsController } from "./recommendations.controller.js"
import { RecommendationsService } from "./recommendations.service.js"

/** Personal recommendations and similar tracks, from the vectors of the tracks. Owns no tables. */
@Module({
  imports: [EmbeddingsModule, LikesModule, TracksModule],
  controllers: [RecommendationsController],
  providers: [RecommendationsService],
})
export class RecommendationsModule {}
