import { create } from "zustand"
import { copy } from "@/constants/copy"
import { RESTART_THRESHOLD_SECONDS } from "@/constants/player"
import type { RepeatMode, Track } from "@/types"
import type { PlaybackErrorKind, PlaybackKind } from "@/types/playback"
import { getPlaybackKind } from "@/utils/playbackKind"

type PlayerState = {
  queue: Track[]
  currentTrack: Track | null
  isPlaying: boolean
  /** Playback position in seconds. */
  progress: number
  /** Real media duration in seconds (falls back to the mock duration until loaded). */
  duration: number
  shuffle: boolean
  repeat: RepeatMode
  /** Where the queue came from, e.g. a playlist name. */
  queueSource: string
  isBuffering: boolean
  /** Where the current track plays from (decided when it starts). */
  source: PlaybackKind
  /** Why the current track cannot be played; null while it can. */
  error: PlaybackErrorKind | null
  /** Tracks skipped in a row because they could not be played. */
  skipStreak: number
  /** Bumped whenever the audio engine must (re)load the current track. */
  playVersion: number
  /** Bumped whenever the audio engine must seek to `progress`. */
  seekVersion: number
}

type PlayerActions = {
  playFromList: (list: Track[], index: number, source?: string) => void
  togglePlaying: () => void
  /** Pauses without toggling (the app went to the background, the player screen closed). */
  pause: () => void
  next: () => void
  previous: () => void
  /** Called by the audio engine when the current track finishes. */
  handleTrackEnd: () => void
  seek: (seconds: number) => void
  retry: () => void
  /** The YouTube video failed: play the track's own audio file instead. */
  fallbackToR2: () => void
  /** Moves on after a track that cannot be played; false when there is nothing to move to. */
  skipAfterError: () => boolean
  toggleShuffle: () => void
  cycleRepeat: () => void
  /** Stops everything and empties the queue (e.g. on logout). */
  reset: () => void
  // Reported by the audio engine.
  setProgress: (seconds: number) => void
  setDuration: (seconds: number) => void
  setBuffering: (buffering: boolean) => void
  setError: (kind: PlaybackErrorKind) => void
}

export type PlayerStore = PlayerState & PlayerActions

const REPEAT_ORDER: RepeatMode[] = ["off", "all", "one"]

/**
 * Whether the player can move on by itself after a track that cannot be played. It stops once
 * every other track of the queue has failed in a row, so a queue of broken tracks does not loop.
 */
export function canAutoSkip(
  state: Pick<PlayerState, "queue" | "currentTrack" | "repeat" | "shuffle" | "skipStreak">,
): boolean {
  const { queue, currentTrack, repeat, shuffle, skipStreak } = state
  if (!currentTrack || queue.length < 2 || skipStreak >= queue.length - 1) return false
  const index = queue.findIndex((track) => track.id === currentTrack.id)
  return shuffle || repeat === "all" || index < queue.length - 1
}

function randomOther(queue: Track[], current: Track): Track {
  const others = queue.filter((track) => track.id !== current.id)
  return others[Math.floor(Math.random() * others.length)] ?? current
}

export const usePlayerStore = create<PlayerStore>()((set, get) => {
  /** Starts a track from the beginning and tells the engine to load it. */
  const start = (track: Track): Partial<PlayerState> => ({
    currentTrack: track,
    progress: 0,
    duration: track.duration,
    isPlaying: true,
    isBuffering: true,
    source: getPlaybackKind(track),
    error: null,
    playVersion: get().playVersion + 1,
  })

  /** Stops at the start of the current track, ready to be played again. */
  const rewindAndStop = (): Partial<PlayerState> => ({
    isPlaying: false,
    progress: 0,
    seekVersion: get().seekVersion + 1,
  })

  return {
    queue: [],
    currentTrack: null,
    isPlaying: false,
    progress: 0,
    duration: 0,
    shuffle: false,
    repeat: "off",
    queueSource: copy.defaultSource,
    isBuffering: false,
    source: "none",
    error: null,
    skipStreak: 0,
    playVersion: 0,
    seekVersion: 0,

    playFromList: (list, index, source = copy.defaultSource) => {
      const track = list[index]
      if (!track) return
      set({ queue: list, queueSource: source, skipStreak: 0, ...start(track) })
    },

    togglePlaying: () => {
      const { currentTrack, error } = get()
      if (!currentTrack) return
      if (error) get().retry()
      else set((state) => ({ isPlaying: !state.isPlaying }))
    },

    pause: () => set({ isPlaying: false, isBuffering: false }),

    next: () => {
      const { queue, currentTrack, shuffle, repeat } = get()
      if (!currentTrack || queue.length === 0) return
      if (shuffle && queue.length > 1) {
        set(start(randomOther(queue, currentTrack)))
        return
      }
      const index = queue.findIndex((track) => track.id === currentTrack.id)
      if (index < queue.length - 1) set(start(queue[index + 1]))
      else if (repeat === "all") set(start(queue[0]))
      else set(rewindAndStop())
    },

    previous: () => {
      const { queue, currentTrack, progress } = get()
      if (!currentTrack || queue.length === 0) return
      const index = queue.findIndex((track) => track.id === currentTrack.id)
      // Restart the current track first if it already played for a few seconds.
      if (progress > RESTART_THRESHOLD_SECONDS || index <= 0) {
        set({ progress: 0, seekVersion: get().seekVersion + 1 })
        return
      }
      set(start(queue[index - 1]))
    },

    handleTrackEnd: () => {
      const { repeat, queue, currentTrack, shuffle } = get()
      if (!currentTrack) return
      if (repeat === "one") {
        set({ progress: 0, isPlaying: true, seekVersion: get().seekVersion + 1 })
        return
      }
      const atEnd = queue.findIndex((track) => track.id === currentTrack.id) >= queue.length - 1
      if (shuffle && queue.length > 1 && (!atEnd || repeat === "all")) {
        set(start(randomOther(queue, currentTrack)))
      } else if (!atEnd) {
        set(start(queue[queue.findIndex((track) => track.id === currentTrack.id) + 1]))
      } else if (repeat === "all") {
        set(start(queue[0]))
      } else {
        set(rewindAndStop())
      }
    },

    seek: (seconds) => {
      const { duration, seekVersion } = get()
      const target = Math.min(Math.max(0, seconds), duration || seconds)
      set({ progress: target, seekVersion: seekVersion + 1 })
    },

    retry: () =>
      set({
        error: null,
        isBuffering: true,
        isPlaying: true,
        playVersion: get().playVersion + 1,
      }),

    fallbackToR2: () =>
      set({
        source: "r2",
        error: null,
        isBuffering: true,
        isPlaying: true,
        playVersion: get().playVersion + 1,
      }),

    skipAfterError: () => {
      const state = get()
      if (!canAutoSkip(state)) return false
      set({ skipStreak: state.skipStreak + 1 })
      get().next()
      return true
    },

    reset: () =>
      set({
        queue: [],
        currentTrack: null,
        isPlaying: false,
        progress: 0,
        duration: 0,
        shuffle: false,
        repeat: "off",
        queueSource: copy.defaultSource,
        isBuffering: false,
        source: "none",
        error: null,
        skipStreak: 0,
      }),

    toggleShuffle: () => set((state) => ({ shuffle: !state.shuffle })),
    cycleRepeat: () =>
      set((state) => ({
        repeat: REPEAT_ORDER[(REPEAT_ORDER.indexOf(state.repeat) + 1) % REPEAT_ORDER.length],
      })),

    // A track that really plays ends a run of skipped ones.
    setProgress: (seconds) =>
      set(
        get().skipStreak > 0 && seconds > 0
          ? { progress: seconds, skipStreak: 0 }
          : { progress: seconds },
      ),
    setDuration: (seconds) => set({ duration: seconds }),
    setBuffering: (buffering) => set({ isBuffering: buffering }),
    setError: (kind) => set({ error: kind, isPlaying: false, isBuffering: false }),
  }
})
