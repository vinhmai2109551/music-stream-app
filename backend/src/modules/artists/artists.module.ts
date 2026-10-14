import { Module } from "@nestjs/common"
import { FollowsModule } from "../follows/index.js"
import { ArtistsController } from "./artists.controller.js"
import { ArtistsService } from "./artists.service.js"

@Module({
  imports: [FollowsModule],
  controllers: [ArtistsController],
  providers: [ArtistsService],
  exports: [ArtistsService],
})
export class ArtistsModule {}
