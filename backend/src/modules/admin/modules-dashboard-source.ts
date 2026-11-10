import { Injectable } from "@nestjs/common"
import type { DailyCount } from "../../shared/index.js"
import { AlbumsService } from "../albums/index.js"
import { ArtistsService } from "../artists/index.js"
import { TracksService } from "../tracks/index.js"
import { UsersService } from "../users/index.js"
import type { DashboardSource, TopTrack } from "./ports.js"

/** Reads each number from the module that owns the table behind it. */
@Injectable()
export class ModulesDashboardSource implements DashboardSource {
  constructor(
    private readonly tracks: TracksService,
    private readonly artists: ArtistsService,
    private readonly albums: AlbumsService,
    private readonly users: UsersService,
  ) {}

  async counts() {
    const [tracks, artists, albums, users, plays] = await Promise.all([
      this.tracks.count(),
      this.artists.count(),
      this.albums.count(),
      this.users.count(),
      this.tracks.totalPlays(),
    ])
    return { tracks, artists, albums, users, plays }
  }

  playsByDay(days: number, timeZone: string): Promise<DailyCount[]> {
    return this.tracks.playsByDay(days, timeZone)
  }

  newUsersByDay(days: number, timeZone: string): Promise<DailyCount[]> {
    return this.users.newByDay(days, timeZone)
  }

  async topTracks(limit: number): Promise<TopTrack[]> {
    const ids = await this.tracks.popularIds(undefined, limit)
    const views = await this.tracks.getByIds(ids)
    return views.map((view) => ({
      id: view.id,
      title: view.title,
      artist: view.artist,
      coverUrl: view.cover,
      plays: view.plays,
    }))
  }
}
