import type { Track } from "./index"

/** Where a track plays from: the official YouTube video, our own file (R2), or nowhere. */
export type PlaybackKind = "youtube" | "r2" | "none"

/**
 * Why a track cannot be played:
 * - `blocked`: the YouTube video cannot be embedded, or it no longer exists.
 * - `missing`: the audio file is not in our storage (404).
 * - `unavailable`: the track has no source at all.
 * - `network`: the source could not be reached or never started.
 */
export type PlaybackErrorKind = "blocked" | "missing" | "unavailable" | "network"

export type Unsubscribe = () => void

/**
 * One way of playing a track. `playerStore` is the source of truth; the playback controller
 * applies it to the source that fits the track and reads position and duration back.
 */
export interface PlaybackSource {
  readonly kind: Exclude<PlaybackKind, "none">
  /** Prepares the track. It does not start playing: call `play` for that. */
  load(track: Track): void
  /** Releases the media (the queue was cleared, or another source took over). */
  unload(): void
  play(): void
  pause(): void
  seekTo(seconds: number): void
  /** Playback position in seconds. */
  getPosition(): number
  /** Length of the media in seconds; 0 while it is not known yet. */
  getDuration(): number
  /** True while the media is loading or buffering. */
  isLoading(): boolean
  /** The track played to its end. */
  onEnded(listener: () => void): Unsubscribe
  /** The track cannot be played. */
  onError(listener: (kind: PlaybackErrorKind) => void): Unsubscribe
}
