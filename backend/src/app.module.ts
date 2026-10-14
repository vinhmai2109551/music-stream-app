import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import { validateEnv } from "./config/env.validation.js"
import { PrismaModule } from "./infrastructure/prisma/prisma.module.js"
import { AlbumsModule } from "./modules/albums/index.js"
import { ArtistsModule } from "./modules/artists/index.js"
import { AuthModule } from "./modules/auth/index.js"
import { CommentsModule } from "./modules/comments/index.js"
import { FeedModule } from "./modules/feed/index.js"
import { FollowsModule } from "./modules/follows/index.js"
import { LikesModule } from "./modules/likes/index.js"
import { PlaylistsModule } from "./modules/playlists/index.js"
import { TracksModule } from "./modules/tracks/index.js"
import { UploadsModule } from "./modules/uploads/index.js"
import { UsersModule } from "./modules/users/index.js"

/**
 * Modular monolith: every domain is a self-contained module under `modules/`.
 * Dependencies between modules go through each module's `index.ts` only.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule,
    UsersModule,
    AuthModule,
    ArtistsModule,
    FollowsModule,
    LikesModule,
    TracksModule,
    AlbumsModule,
    PlaylistsModule,
    CommentsModule,
    FeedModule,
    UploadsModule,
  ],
})
export class AppModule {}
