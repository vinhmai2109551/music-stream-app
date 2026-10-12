import { create } from "zustand"
import { copy } from "@/constants/copy"
import type { RepeatMode, Track } from "@/types"

type PlayerState = {
  queue: Track[]
  currentTrack: Track | null
  isPlaying: boolean
  /** Playback position in seconds. */
  progress: number
  shuffle: boolean
  repeat: RepeatMode
  /** Where the queue came from, e.g. a playlist name. */
  queueSource: string
}

type PlayerActions = {
  playFromList: (list: Track[], index: number, source?: string) => void
  togglePlaying: () => void
  next: () => void
  previous: () => void
  /** Called by the audio engine when the current track finishes. */
  handleTrackEnd: () => void
  seek: (seconds: number) => void
  setProgress: (seconds: number) => void
  toggleShuffle: () => void
  cycleRepeat: () => void
}

export type PlayerStore = PlayerState & PlayerActions

const REPEAT_ORDER: RepeatMode[] = ["off", "all", "one"]

function randomOther(queue: Track[], current: Track): Track {
  const others = queue.filter((track) => track.id !== current.id)
  return others[Math.floor(Math.random() * others.length)] ?? current
}

export const usePlayerStore = create<PlayerStore>()((set, get) => ({
  queue: [],
  currentTrack: null,
  isPlaying: false,
  progress: 0,
  shuffle: false,
  repeat: "off",
  queueSource: copy.defaultSource,

  playFromList: (list, index, source = copy.defaultSource) => {
    const track = list[index]
    if (!track) return
    set({ queue: list, currentTrack: track, queueSource: source, progress: 0, isPlaying: true })
  },

  togglePlaying: () => {
    if (get().currentTrack) set((s) => ({ isPlaying: !s.isPlaying }))
  },

  next: () => {
    const { queue, currentTrack, shuffle, repeat } = get()
    if (!currentTrack || queue.length === 0) return
    if (shuffle && queue.length > 1) {
      set({ currentTrack: randomOther(queue, currentTrack), progress: 0 })
      return
    }
    const index = queue.findIndex((track) => track.id === currentTrack.id)
    if (index < queue.length - 1) {
      set({ currentTrack: queue[index + 1], progress: 0 })
    } else if (repeat === "all") {
      set({ currentTrack: queue[0], progress: 0 })
    } else {
      set({ isPlaying: false, progress: currentTrack.duration })
    }
  },

  previous: () => {
    const { queue, currentTrack, progress } = get()
    if (!currentTrack || queue.length === 0) return
    const index = queue.findIndex((track) => track.id === currentTrack.id)
    // Restart the track first if it already played for a few seconds.
    if (progress > 3 || index <= 0) {
      set({ progress: 0 })
      return
    }
    set({ currentTrack: queue[index - 1], progress: 0 })
  },

  handleTrackEnd: () => {
    const { repeat, queue, currentTrack, shuffle } = get()
    if (!currentTrack) return
    if (repeat === "one") {
      set({ progress: 0, isPlaying: true })
      return
    }
    const atEnd = queue.findIndex((track) => track.id === currentTrack.id) >= queue.length - 1
    if (shuffle && queue.length > 1 && (!atEnd || repeat === "all")) {
      set({ currentTrack: randomOther(queue, currentTrack), progress: 0 })
      return
    }
    if (!atEnd) get().next()
    else if (repeat === "all") set({ currentTrack: queue[0], progress: 0 })
    else set({ isPlaying: false, progress: currentTrack.duration })
  },

  seek: (seconds) => set({ progress: Math.max(0, seconds) }),
  setProgress: (seconds) => set({ progress: seconds }),
  toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),
  cycleRepeat: () =>
    set((s) => ({
      repeat: REPEAT_ORDER[(REPEAT_ORDER.indexOf(s.repeat) + 1) % REPEAT_ORDER.length],
    })),
}))
