import { Module } from "@nestjs/common"
import { AlbumsModule } from "../albums/index.js"
import { ArtistsModule } from "../artists/index.js"
import { AuthModule, AuthService } from "../auth/index.js"
import { LyricsModule } from "../lyrics/index.js"
import { TracksModule } from "../tracks/index.js"
import { UsersModule, UsersService } from "../users/index.js"
import { AdminStatsController } from "./admin-stats.controller.js"
import { AdminStatsService } from "./admin-stats.service.js"
import { AdminTracksController } from "./admin-tracks.controller.js"
import { AdminTracksService } from "./admin-tracks.service.js"
import { AdminUsersController } from "./admin-users.controller.js"
import { AdminUsersService } from "./admin-users.service.js"
import { ModulesDashboardSource } from "./modules-dashboard-source.js"
import { DASHBOARD_SOURCE, SESSION_CONTROL, USER_ADMINISTRATION } from "./ports.js"

/**
 * Endpoints of the admin web that look across modules: the dashboard numbers, the management of
 * accounts and the lyrics status of the tracks table. It owns no table; every read and write goes
 * through the public API of the module that does. Nothing depends on it.
 */
@Module({
  imports: [UsersModule, AuthModule, TracksModule, ArtistsModule, AlbumsModule, LyricsModule],
  controllers: [AdminStatsController, AdminUsersController, AdminTracksController],
  providers: [
    { provide: USER_ADMINISTRATION, useExisting: UsersService },
    { provide: SESSION_CONTROL, useExisting: AuthService },
    { provide: DASHBOARD_SOURCE, useClass: ModulesDashboardSource },
    AdminStatsService,
    AdminUsersService,
    AdminTracksService,
  ],
})
export class AdminModule {}
