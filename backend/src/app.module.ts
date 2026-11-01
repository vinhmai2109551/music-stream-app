import { Module } from "@nestjs/common"
import { ConfigModule, ConfigService } from "@nestjs/config"
import { ThrottlerModule } from "@nestjs/throttler"
import { validateEnv } from "./config/env.validation.js"
import { PrismaModule } from "./infrastructure/prisma/prisma.module.js"
import { AlbumsModule } from "./modules/albums/index.js"
import { ArtistsModule } from "./modules/artists/index.js"
import { AuthModule, authThrottlers } from "./modules/auth/index.js"
import { CommentsModule } from "./modules/comments/index.js"
import { FeedModule } from "./modules/feed/index.js"
import { FollowsModule } from "./modules/follows/index.js"
import { LikesModule } from "./modules/likes/index.js"
import { PlaylistsModule } from "./modules/playlists/index.js"
import { playThrottler, TracksModule } from "./modules/tracks/index.js"
import { UploadsModule } from "./modules/uploads/index.js"
import { UsersModule } from "./modules/users/index.js"

/**
 * Modular monolith: every domain is a self-contained module under `modules/`.
 * Dependencies between modules go through each module's `index.ts` only.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // ThrottlerModule is global, so it is registered once, here, with the limits each module
    // declares. A route is only limited when it carries @ThrottleGroup(...).
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [...authThrottlers(config), playThrottler(config)],
      }),
    }),
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
