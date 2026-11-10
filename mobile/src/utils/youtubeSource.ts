import type { YoutubeIframeRef } from "react-native-youtube-iframe"
import { YOUTUBE_POLL_INTERVAL_MS } from "@/constants/player"
import type { Track } from "@/types"
import type { PlaybackErrorKind, PlaybackSource, Unsubscribe } from "@/types/playback"

/** States the YouTube iframe reports (the names react-native-youtube-iframe uses). */
type PlayerState = "unstarted" | "ended" | "playing" | "paused" | "buffering" | "video cued"

/** An answer from the iframe is dropped if it takes longer than this (the next question goes out). */
const ASK_TIMEOUT_MS = 3_000
/** A change of state this soon after our own command is its answer, not a tap inside the video. */
const OWN_COMMAND_WINDOW_MS = 1_000

/** What the source needs from a YouTube player (the iframe player of the app, or the web one). */
export type YouTubePlayerHandle = Pick<
  YoutubeIframeRef,
  "getCurrentTime" | "getDuration" | "seekTo"
>

/** What the YouTube view draws. It is replaced, never changed in place, on every update. */
export interface YouTubeViewState {
  videoId: string | null
  /** Whether the video should be playing. */
  playing: boolean
  /** Changes when the player has to be created again (e.g. it never got ready). */
  instance: number
}

/**
 * Plays the official YouTube video of a track through the YouTube IFrame player.
 * The player is a view (`YouTubePlayerView`) that only exists while the player screen is open;
 * this class is its model: it holds what should be playing and reads the position back by asking
 * the iframe every 500 ms. The audio is never downloaded or extracted - the video is embedded.
 */
export class YouTubeSource implements PlaybackSource {
  readonly kind = "youtube" as const

  private view: YouTubeViewState = { videoId: null, playing: false, instance: 0 }
  private readonly viewListeners = new Set<() => void>()
  private readonly attachListeners = new Set<(attached: boolean) => void>()
  private readonly endedListeners = new Set<() => void>()
  private readonly errorListeners = new Set<(kind: PlaybackErrorKind) => void>()
  private readonly playingListeners = new Set<(playing: boolean) => void>()

  private player: YouTubePlayerHandle | null = null
  private ready = false
  private playerState: PlayerState = "unstarted"
  private position = 0
  private duration = 0
  /** A seek that waits for the video to play (seeking a stopped video would start it). */
  private pendingSeek: number | null = null
  private timer: ReturnType<typeof setInterval> | null = null
  private askedAt: number | null = null
  /** When we last told the video to play, pause or load. */
  private commandAt = 0
  /** Bumped on every load, so an answer from the iframe about an earlier video is ignored. */
  private epoch = 0
  /** Bumped on every seek, so a position asked for before the seek does not undo it. */
  private seeks = 0

  constructor(private readonly pollMs: number = YOUTUBE_POLL_INTERVAL_MS) {}

  // ------------------------------------------------------------ PlaybackSource

  load(track: Track): void {
    const videoId = track.youtubeVideoId
    if (!videoId) return
    this.epoch += 1
    this.commandAt = Date.now()
    this.position = 0
    this.duration = 0
    this.pendingSeek = null
    if (videoId === this.view.videoId && this.player && this.ready) {
      // The same video again (replay): rewind it instead of loading it a second time.
      this.player.seekTo(0, true)
      this.update({ playing: false })
      return
    }
    this.playerState = "unstarted"
    // A player that never got ready is created again; a ready one just loads the new video.
    const recreate = this.player !== null && !this.ready
    this.update({
      videoId,
      playing: false,
      instance: recreate ? this.view.instance + 1 : this.view.instance,
    })
  }

  unload(): void {
    this.epoch += 1
    this.commandAt = Date.now()
    this.position = 0
    this.duration = 0
    this.pendingSeek = null
    if (this.view.playing) this.update({ playing: false })
  }

  play(): void {
    this.commandAt = Date.now()
    this.update({ playing: true })
    this.flushSeek()
  }

  pause(): void {
    this.commandAt = Date.now()
    this.update({ playing: false })
  }

  seekTo(seconds: number): void {
    this.position = seconds
    this.seeks += 1
    // Seeking a video that has not started (or has ended) would start it, so it waits for play().
    const stopped =
      !this.view.playing &&
      (this.playerState === "unstarted" ||
        this.playerState === "video cued" ||
        this.playerState === "ended")
    if (this.player && this.ready && !stopped) this.player.seekTo(seconds, true)
    else this.pendingSeek = seconds
  }

  getPosition(): number {
    return this.position
  }

  getDuration(): number {
    return this.duration
  }

  isLoading(): boolean {
    if (!this.view.playing) return false
    if (!this.player || !this.ready) return true
    return (
      this.playerState === "unstarted" ||
      this.playerState === "buffering" ||
      this.playerState === "video cued"
    )
  }

  onEnded(listener: () => void): Unsubscribe {
    this.endedListeners.add(listener)
    return () => this.endedListeners.delete(listener)
  }

  onError(listener: (kind: PlaybackErrorKind) => void): Unsubscribe {
    this.errorListeners.add(listener)
    return () => this.errorListeners.delete(listener)
  }

  /**
   * The viewer played or paused the video inside the player (not through the app's buttons), so
   * the app's own state has to follow.
   */
  onPlayingChange(listener: (playing: boolean) => void): Unsubscribe {
    this.playingListeners.add(listener)
    return () => this.playingListeners.delete(listener)
  }

  // ------------------------------------------------------------ the view's side

  /** What the view should draw; the same object until something changes. */
  getViewState = (): YouTubeViewState => this.view

  subscribeView = (listener: () => void): Unsubscribe => {
    this.viewListeners.add(listener)
    return () => this.viewListeners.delete(listener)
  }

  isAttached = (): boolean => this.player !== null

  onAttachedChange(listener: (attached: boolean) => void): Unsubscribe {
    this.attachListeners.add(listener)
    return () => this.attachListeners.delete(listener)
  }

  /** The player screen opened and its YouTube player exists (or was created again). */
  attach(player: YouTubePlayerHandle): void {
    this.player = player
    this.ready = false
    this.playerState = "unstarted"
    this.attachListeners.forEach((listener) => listener(true))
  }

  /** The player screen closed: the video cannot keep playing without its view. */
  detach(): void {
    this.stopAsking()
    this.player = null
    this.ready = false
    this.playerState = "unstarted"
    this.pendingSeek = null
    this.attachListeners.forEach((listener) => listener(false))
  }

  handleReady(): void {
    this.ready = true
    this.startAsking()
    void this.askDuration()
    if (this.view.playing) this.flushSeek()
  }

  handleState(state: string): void {
    this.playerState = state as PlayerState
    if (state === "playing") void this.askDuration()
    if (state === "ended") this.endedListeners.forEach((listener) => listener())
    if (Date.now() - this.commandAt <= OWN_COMMAND_WINDOW_MS) return
    if (state === "paused" && this.view.playing) this.emitPlaying(false)
    if (state === "playing" && !this.view.playing) this.emitPlaying(true)
  }

  /**
   * `name` is react-native-youtube-iframe's error name. An HTML5 error is a playback failure that
   * may pass; every other one (embedding off, video gone, bad id, unknown) means the video cannot
   * be used here.
   */
  handleError(name: string | undefined): void {
    const kind: PlaybackErrorKind = name === "HTML5_error" ? "network" : "blocked"
    this.errorListeners.forEach((listener) => listener(kind))
  }

  /** The page could not even load (no internet). */
  handleLoadFailure(): void {
    this.errorListeners.forEach((listener) => listener("network"))
  }

  // ------------------------------------------------------------ internals

  private update(change: Partial<YouTubeViewState>): void {
    this.view = { ...this.view, ...change }
    this.viewListeners.forEach((listener) => listener())
  }

  private emitPlaying(playing: boolean): void {
    this.playingListeners.forEach((listener) => listener(playing))
  }

  private flushSeek(): void {
    if (this.pendingSeek === null || !this.player || !this.ready) return
    this.player.seekTo(this.pendingSeek, true)
    this.pendingSeek = null
  }

  private startAsking(): void {
    if (this.timer) return
    this.timer = setInterval(() => void this.askPosition(), this.pollMs)
  }

  private stopAsking(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    this.askedAt = null
  }

  /** Asks the iframe for the position; one question at a time (each unanswered one keeps a listener). */
  private async askPosition(): Promise<void> {
    const player = this.player
    if (!player || !this.ready || this.playerState !== "playing") return
    if (this.askedAt !== null && Date.now() - this.askedAt < ASK_TIMEOUT_MS) return
    const { epoch, seeks } = this
    this.askedAt = Date.now()
    try {
      const seconds = await player.getCurrentTime()
      if (epoch === this.epoch && seeks === this.seeks && Number.isFinite(seconds)) {
        this.position = seconds
      }
    } catch {
      // The player went away while we asked; the next question will find out.
    } finally {
      this.askedAt = null
    }
  }

  private async askDuration(): Promise<void> {
    const player = this.player
    if (!player) return
    const epoch = this.epoch
    try {
      const seconds = await player.getDuration()
      if (epoch === this.epoch && seconds > 0) this.duration = seconds
    } catch {
      // The player went away while we asked.
    }
  }
}

/** The one YouTube player of the app (there is never more than one on screen). */
export const youTubeSource = new YouTubeSource()
