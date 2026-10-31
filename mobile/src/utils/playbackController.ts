import { copy } from "@/constants/copy"
import {
  AUDIO_UPDATE_INTERVAL_MS,
  AUTO_SKIP_DELAY_MS,
  LOAD_TIMEOUT_MS,
  PLAYER_SCREEN_GRACE_MS,
} from "@/constants/player"
import { canAutoSkip, type PlayerStore, type usePlayerStore } from "@/store/playerStore"
import type { PlaybackErrorKind, PlaybackSource, Unsubscribe } from "@/types/playback"
import { probeAudio, type ProbeResult } from "./probeAudio"

/** The YouTube source also tells whether its player (a view of the player screen) exists. */
export interface AttachableSource extends PlaybackSource {
  isAttached(): boolean
  onAttachedChange(listener: (attached: boolean) => void): Unsubscribe
  /** The viewer played or paused the video inside the player. */
  onPlayingChange(listener: (playing: boolean) => void): Unsubscribe
}

export interface PlaybackControllerOptions {
  /** How often position and loading state are read from the source. */
  pollMs: number
  /** A track that keeps loading for this long fails as `network`. */
  loadTimeoutMs: number
  /** A YouTube track waits this long for the player screen before it pauses. */
  playerScreenGraceMs: number
  /** A track that cannot be played is skipped after this long. */
  autoSkipMs: number
}

const DEFAULT_OPTIONS: PlaybackControllerOptions = {
  pollMs: AUDIO_UPDATE_INTERVAL_MS,
  loadTimeoutMs: LOAD_TIMEOUT_MS,
  playerScreenGraceMs: PLAYER_SCREEN_GRACE_MS,
  autoSkipMs: AUTO_SKIP_DELAY_MS,
}

interface Dependencies {
  store: typeof usePlayerStore
  r2: PlaybackSource
  youtube: AttachableSource
  /** Shows a short message (a toast). */
  notify: (message: string) => void
  probe?: (url: string) => Promise<ProbeResult>
  options?: Partial<PlaybackControllerOptions>
}

type State = PlayerStore

/**
 * Plays what `playerStore` says. The store is the source of truth: this applies it to the source
 * that fits the current track (its YouTube video, or its audio file) and reports position,
 * duration and trouble back. A track that cannot be played is reported, never replaced by
 * other music.
 */
export class PlaybackController {
  private readonly options: PlaybackControllerOptions
  private readonly probe: (url: string) => Promise<ProbeResult>
  private readonly storeListeners: Unsubscribe[] = []
  private sourceListeners: Unsubscribe[] = []
  private active: PlaybackSource | null = null
  private pollTimer: ReturnType<typeof setInterval> | null = null
  private graceTimer: ReturnType<typeof setTimeout> | null = null
  private skipTimer: ReturnType<typeof setTimeout> | null = null
  private loadingSince: number | null = null
  private waitingForScreen = false
  /** Changes with every (re)start of a track, so late answers about an earlier one are ignored. */
  private token = 0

  constructor(private readonly deps: Dependencies) {
    this.options = { ...DEFAULT_OPTIONS, ...deps.options }
    this.probe = deps.probe ?? probeAudio
  }

  start(): void {
    const { store, youtube } = this.deps
    this.storeListeners.push(store.subscribe((state, previous) => this.onStore(state, previous)))
    this.storeListeners.push(youtube.onAttachedChange((attached) => this.onAttached(attached)))
    this.storeListeners.push(youtube.onPlayingChange((playing) => this.onVideoToggled(playing)))
    if (store.getState().currentTrack) this.begin(store.getState())
  }

  dispose(): void {
    this.storeListeners.splice(0).forEach((stop) => stop())
    this.stopActive()
  }

  /** The app left the screen: a YouTube video cannot keep playing, so the player pauses. */
  handleBackground(): void {
    if (this.active?.kind === "youtube") this.deps.store.getState().pause()
  }

  // ------------------------------------------------------------ store changes

  private onStore(state: State, previous: State): void {
    if (!state.currentTrack) {
      if (previous.currentTrack) this.stopActive()
      return
    }
    if (
      state.currentTrack.id !== previous.currentTrack?.id ||
      state.playVersion !== previous.playVersion
    ) {
      this.begin(state)
      return
    }
    if (state.isPlaying !== previous.isPlaying) this.applyPlaying(state.isPlaying)
    if (state.seekVersion !== previous.seekVersion) this.active?.seekTo(state.progress)
  }

  /** (Re)starts the current track on the source that fits it. */
  private begin(state: State): void {
    const track = state.currentTrack
    if (!track) return
    this.token += 1
    this.clearTimers()
    this.sourceListeners.splice(0).forEach((stop) => stop())
    this.waitingForScreen = false

    const { r2, youtube } = this.deps
    const source = state.source === "youtube" ? youtube : state.source === "r2" ? r2 : null
    for (const other of [r2, youtube]) if (other !== source) other.unload()
    this.active = source
    if (!source) {
      this.fail("unavailable")
      return
    }

    this.sourceListeners.push(
      source.onEnded(() => this.deps.store.getState().handleTrackEnd()),
      source.onError((kind) => this.onSourceError(kind)),
    )
    source.load(track)
    if (state.isPlaying) source.play()
    this.pollTimer = setInterval(() => this.tick(), this.options.pollMs)
    if (state.isPlaying && source === youtube && !youtube.isAttached()) this.waitForPlayerScreen()
  }

  private applyPlaying(playing: boolean): void {
    const source = this.active
    if (!source) return
    if (!playing) {
      source.pause()
      return
    }
    this.loadingSince = null
    source.play()
    if (source === this.deps.youtube && !this.deps.youtube.isAttached()) this.waitForPlayerScreen()
  }

  private stopActive(): void {
    this.token += 1
    this.clearTimers()
    this.sourceListeners.splice(0).forEach((stop) => stop())
    this.waitingForScreen = false
    this.active = null
    this.deps.r2.unload()
    this.deps.youtube.unload()
  }

  // ------------------------------------------------------------ reading back

  private tick(): void {
    const source = this.active
    if (!source) return
    const state = this.deps.store.getState()

    const duration = source.getDuration()
    if (duration > 0 && duration !== state.duration) state.setDuration(duration)

    const loading = source.isLoading()
    const buffering = loading && state.isPlaying
    if (buffering !== state.isBuffering) state.setBuffering(buffering)
    if (state.isPlaying && !loading) {
      const position = source.getPosition()
      if (position !== state.progress) state.setProgress(position)
    }

    // Give up on a track that never finishes loading (e.g. no network).
    if (!buffering || this.waitingForScreen) {
      this.loadingSince = null
    } else {
      this.loadingSince ??= Date.now()
      if (Date.now() - this.loadingSince > this.options.loadTimeoutMs) this.fail("network")
    }
  }

  // ------------------------------------------------------------ the YouTube player screen

  private onAttached(attached: boolean): void {
    if (attached) {
      this.waitingForScreen = false
      if (this.graceTimer) clearTimeout(this.graceTimer)
      this.graceTimer = null
      return
    }
    // The player screen closed, so its video cannot go on playing. A view that is only being
    // rebuilt is back before this runs.
    setTimeout(() => {
      const { store, youtube } = this.deps
      if (youtube.isAttached() || this.active !== youtube) return
      if (store.getState().isPlaying) store.getState().pause()
    }, 0)
  }

  /** The video was played or paused inside the player; the app's buttons have to agree. */
  private onVideoToggled(playing: boolean): void {
    const state = this.deps.store.getState()
    if (this.active !== this.deps.youtube || state.isPlaying === playing || state.error) return
    if (playing) state.togglePlaying()
    else state.pause()
  }

  /** The player screen is not open yet; if it does not open soon, the track pauses. */
  private waitForPlayerScreen(): void {
    this.waitingForScreen = true
    const token = this.token
    if (this.graceTimer) clearTimeout(this.graceTimer)
    this.graceTimer = setTimeout(() => {
      if (token !== this.token || !this.waitingForScreen) return
      this.waitingForScreen = false
      this.deps.store.getState().pause()
      this.deps.notify(copy.player.openPlayerToListen)
    }, this.options.playerScreenGraceMs)
  }

  // ------------------------------------------------------------ trouble

  private onSourceError(kind: PlaybackErrorKind): void {
    const state = this.deps.store.getState()
    const track = state.currentTrack
    if (!track) return
    if (this.active?.kind === "youtube" && kind === "blocked") {
      if (!track.audioUrl) {
        this.fail("blocked")
        return
      }
      // The embed is refused: the track's own audio file takes over, if it has one.
      const token = this.token
      void this.probe(track.audioUrl).then((result) => {
        if (token !== this.token) return
        if (result === "ok") this.deps.store.getState().fallbackToR2()
        else this.fail("blocked")
      })
      return
    }
    this.fail(kind)
  }

  /** Stops the track, tells the user why, and moves on when the problem will not go away. */
  private fail(kind: PlaybackErrorKind): void {
    const { store, notify } = this.deps
    if (store.getState().error === kind) return
    store.getState().setError(kind)
    if (kind === "blocked") notify(copy.player.cannotPlayInApp)
    else if (kind !== "network") notify(copy.player.noSource)

    if (kind === "network" || !canAutoSkip(store.getState())) return
    const token = this.token
    if (this.skipTimer) clearTimeout(this.skipTimer)
    this.skipTimer = setTimeout(() => {
      if (token === this.token && store.getState().error) store.getState().skipAfterError()
    }, this.options.autoSkipMs)
  }

  private clearTimers(): void {
    if (this.pollTimer) clearInterval(this.pollTimer)
    if (this.graceTimer) clearTimeout(this.graceTimer)
    if (this.skipTimer) clearTimeout(this.skipTimer)
    this.pollTimer = this.graceTimer = this.skipTimer = null
    this.loadingSince = null
  }
}
