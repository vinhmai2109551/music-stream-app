import { Module } from "@nestjs/common"
import { ArtistsModule } from "../artists/index.js"
import { CommentsModule } from "../comments/index.js"
import { TracksModule } from "../tracks/index.js"
import { FeedController } from "./feed.controller.js"
import { FeedService } from "./feed.service.js"

@Module({
  imports: [ArtistsModule, TracksModule, CommentsModule],
  controllers: [FeedController],
  providers: [FeedService],
  exports: [FeedService],
})
export class FeedModule {}
