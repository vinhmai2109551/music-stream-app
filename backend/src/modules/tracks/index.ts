/** Public API of the tracks module. Other modules must import from here only. */
export { TracksModule } from "./tracks.module.js"
export { TracksService } from "./tracks.service.js"
export { playThrottler } from "./tracks.config.js"
export type {
  PlayResult,
  TrackEmbeddingSource,
  TrackKeywordMatch,
  TrackView,
} from "./tracks.service.js"
