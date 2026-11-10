import { Module } from "@nestjs/common"
import { ArtistsModule } from "../artists/index.js"
import { LikesModule } from "../likes/index.js"
import { UploadsModule } from "../uploads/index.js"
import { TracksController } from "./tracks.controller.js"
import { TracksService } from "./tracks.service.js"

@Module({
  imports: [ArtistsModule, LikesModule, UploadsModule],
  controllers: [TracksController],
  providers: [TracksService],
  exports: [TracksService],
})
export class TracksModule {}
