import { Injectable } from "@nestjs/common"
import { LyricsService, type LyricsStatus } from "../lyrics/index.js"

const NO_LYRICS: LyricsStatus = { hasLyrics: false, hasTimings: false }

/** Admin views of the catalog that need more than one module. */
@Injectable()
export class AdminTracksService {
  constructor(private readonly lyrics: LyricsService) {}

  /** The lyrics status of every track asked for (a track without lyrics gets no/no). */
  async lyricsStatus(trackIds: readonly string[]): Promise<Record<string, LyricsStatus>> {
    const found = await this.lyrics.statusOf(trackIds)
    return Object.fromEntries(trackIds.map((id) => [id, found.get(id) ?? NO_LYRICS]))
  }
}
