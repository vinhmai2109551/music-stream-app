import { Module } from "@nestjs/common"
import { ArtistsModule } from "../artists/index.js"
import { LikesModule } from "../likes/index.js"
import { TracksModule } from "../tracks/index.js"
import { AlbumsController } from "./albums.controller.js"
import { AlbumsService } from "./albums.service.js"

@Module({
  imports: [ArtistsModule, TracksModule, LikesModule],
  controllers: [AlbumsController],
  providers: [AlbumsService],
  exports: [AlbumsService],
})
export class AlbumsModule {}
