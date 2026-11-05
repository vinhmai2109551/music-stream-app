import { jest } from "@jest/globals"
import type { Track } from "@/types"
import type { PlaybackErrorKind } from "@/types/playback"
import type { AttachableSource } from "@/utils/playbackController"

// ---------------------------------------------------------------- helpers

export function makeTrack(id: string, extra: Partial<Track> = {}): Track {
  return {
    id,
    title: `Title ${id}`,
    artist: "Artist",
    cover: "cover.jpg",
    duration: 200,
    plays: 1,
    audioUrl: `https://media.example/${id}.mp3`,
    youtubeVideoId: null,
    ...extra,
  } as unknown as Track
}
export const r2Track = (id: string) => makeTrack(id)
export const ytTrack = (id: string, extra: Partial<Track> = {}) =>
  makeTrack(id, { youtubeVideoId: `vid-${id}`, ...extra })
export const noSourceTrack = (id: string) => makeTrack(id, { audioUrl: "" })

export const settle = () => new Promise<void>((resolve) => setImmediate(resolve))

/** Advances the fake clock in small steps, so interval callbacks see a moving Date.now(). */
export function advance(ms: number, step = 5) {
  for (let spent = 0; spent < ms; spent += step) jest.advanceTimersByTime(step)
}

export class FakeSource implements AttachableSource {
  calls: string[] = []
  loaded: Track | null = null
  playing = false
  position = 0
  duration = 0
  loading = false
  attached = true
  private ended = new Set<() => void>()
  private errors = new Set<(kind: PlaybackErrorKind) => void>()
  private attachedListeners = new Set<(attached: boolean) => void>()
  private playingListeners = new Set<(playing: boolean) => void>()

  constructor(readonly kind: "r2" | "youtube") {}

  load(track: Track) {
    this.calls.push(`load:${track.id}`)
    this.loaded = track
  }
  unload() {
    this.calls.push("unload")
    this.loaded = null
    this.playing = false
  }
  play() {
    this.calls.push("play")
    this.playing = true
  }
  pause() {
    this.calls.push("pause")
    this.playing = false
  }
  seekTo(seconds: number) {
    this.calls.push(`seek:${seconds}`)
  }
  getPosition() {
    return this.position
  }
  getDuration() {
    return this.duration
  }
  isLoading() {
    return this.loading
  }
  onEnded(listener: () => void) {
    this.ended.add(listener)
    return () => this.ended.delete(listener)
  }
  onError(listener: (kind: PlaybackErrorKind) => void) {
    this.errors.add(listener)
    return () => this.errors.delete(listener)
  }
  isAttached() {
    return this.attached
  }
  onAttachedChange(listener: (attached: boolean) => void) {
    this.attachedListeners.add(listener)
    return () => this.attachedListeners.delete(listener)
  }
  onPlayingChange(listener: (playing: boolean) => void) {
    this.playingListeners.add(listener)
    return () => this.playingListeners.delete(listener)
  }
  emitPlaying(playing: boolean) {
    this.playingListeners.forEach((listener) => listener(playing))
  }
  setAttached(attached: boolean) {
    this.attached = attached
    this.attachedListeners.forEach((listener) => listener(attached))
  }
  emitEnded() {
    this.ended.forEach((listener) => listener())
  }
  emitError(kind: PlaybackErrorKind) {
    this.errors.forEach((listener) => listener(kind))
  }
}
