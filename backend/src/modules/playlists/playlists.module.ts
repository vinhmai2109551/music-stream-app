import { Module } from "@nestjs/common"
import { LikesModule } from "../likes/index.js"
import { TracksModule } from "../tracks/index.js"
import { UsersModule } from "../users/index.js"
import { PlaylistsController } from "./playlists.controller.js"
import { PlaylistsService } from "./playlists.service.js"

@Module({
  imports: [TracksModule, LikesModule, UsersModule],
  controllers: [PlaylistsController],
  providers: [PlaylistsService],
  exports: [PlaylistsService],
})
export class PlaylistsModule {}
