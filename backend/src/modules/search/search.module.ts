import { Module } from "@nestjs/common"
import { ArtistsModule } from "../artists/index.js"
import { EmbeddingsModule } from "../embeddings/index.js"
import { TracksModule } from "../tracks/index.js"
import { SearchController } from "./search.controller.js"
import { SearchService } from "./search.service.js"

/** Search by meaning (vectors) merged with search by words. Owns no tables. */
@Module({
  imports: [EmbeddingsModule, TracksModule, ArtistsModule],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
