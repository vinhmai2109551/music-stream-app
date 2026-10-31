import type { AudioPlayer } from "expo-audio"
import { LOCK_SCREEN_SEEK_SECONDS } from "@/constants/player"
import type { Track } from "@/types"
import type { PlaybackErrorKind, PlaybackSource, Unsubscribe } from "@/types/playback"
import { probeAudio, type ProbeResult } from "./probeAudio"

/** The part of an expo-audio player this source uses (a fake can stand in for it in tests). */
export type AudioPlayerLike = Pick<
  AudioPlayer,
  | "replace"
  | "play"
  | "pause"
  | "seekTo"
  | "currentTime"
  | "duration"
  | "isLoaded"
  | "isBuffering"
  | "addListener"
  | "setActiveForLockScreen"
  | "clearLockScreenControls"
>

/**
 * Plays the audio file of a track (`audioUrl`, in our R2 bucket) with expo-audio, and shows the
 * track on the lock screen. A file that is not in the bucket is reported as `missing` right away.
 */
export class R2AudioSource implements PlaybackSource {
  readonly kind = "r2" as const

  private readonly endedListeners = new Set<() => void>()
  private readonly errorListeners = new Set<(kind: PlaybackErrorKind) => void>()
  private readonly subscription: { remove: () => void }
  private wantPlaying = false
  private loaded = false
  /** Bumped on every load and unload, so the answer to an old probe is ignored. */
  private loadId = 0

  constructor(
    private readonly player: AudioPlayerLike,
    private readonly probe: (url: string) => Promise<ProbeResult> = probeAudio,
  ) {
    this.subscription = player.addListener("playbackStatusUpdate", (status) => {
      if (status.didJustFinish) this.endedListeners.forEach((listener) => listener())
    })
  }

  load(track: Track): void {
    const id = ++this.loadId
    this.loaded = true
    this.player.replace(track.audioUrl)
    this.showOnLockScreen(track)
    void this.probe(track.audioUrl).then((result) => {
      if (id === this.loadId && result === "missing") this.emitError("missing")
    })
  }

  unload(): void {
    if (!this.loaded) return
    this.loaded = false
    this.loadId += 1
    this.wantPlaying = false
    this.player.pause()
    this.player.replace(null)
    try {
      this.player.clearLockScreenControls()
    } catch {
      // Lock screen controls are optional.
    }
  }

  play(): void {
    this.wantPlaying = true
    this.player.play()
  }

  pause(): void {
    this.wantPlaying = false
    this.player.pause()
  }

  seekTo(seconds: number): void {
    // A finished track stays paused after a seek, so start it again when it should be playing.
    this.player
      .seekTo(seconds)
      .then(() => {
        if (this.wantPlaying) this.player.play()
      })
      .catch(() => {
        // Nothing is loaded (yet) to seek in.
      })
  }

  getPosition(): number {
    return this.player.currentTime
  }

  getDuration(): number {
    return this.player.duration
  }

  isLoading(): boolean {
    return !this.player.isLoaded || this.player.isBuffering
  }

  onEnded(listener: () => void): Unsubscribe {
    this.endedListeners.add(listener)
    return () => this.endedListeners.delete(listener)
  }

  onError(listener: (kind: PlaybackErrorKind) => void): Unsubscribe {
    this.errorListeners.add(listener)
    return () => this.errorListeners.delete(listener)
  }

  /** Stops listening to the player (the component that owns it is going away). */
  dispose(): void {
    this.subscription.remove()
    this.endedListeners.clear()
    this.errorListeners.clear()
  }

  private emitError(kind: PlaybackErrorKind): void {
    this.errorListeners.forEach((listener) => listener(kind))
  }

  private showOnLockScreen(track: Track): void {
    try {
      this.player.setActiveForLockScreen(
        true,
        { title: track.title, artist: track.artist, artworkUrl: track.cover },
        {
          showSeekForward: true,
          showSeekBackward: true,
          seekForwardIntervalSeconds: LOCK_SCREEN_SEEK_SECONDS,
          seekBackwardIntervalSeconds: LOCK_SCREEN_SEEK_SECONDS,
        },
      )
    } catch {
      // Lock screen controls are optional (not every environment, e.g. Expo Go, has them).
    }
  }
}
