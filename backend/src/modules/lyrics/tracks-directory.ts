import { Injectable } from "@nestjs/common"
import { TracksService } from "../tracks/index.js"
import type { TrackDirectory } from "./ports.js"

/** Asks the tracks module whether a track exists (it answers 404 when it does not). */
@Injectable()
export class TracksDirectory implements TrackDirectory {
  constructor(private readonly tracks: TracksService) {}

  async find(trackId: string): Promise<{ title: string; artist: string }> {
    const { title, artist } = await this.tracks.get(trackId)
    return { title, artist }
  }
}
