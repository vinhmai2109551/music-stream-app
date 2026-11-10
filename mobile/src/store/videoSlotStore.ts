import { create } from "zustand"

/** A rectangle in window coordinates. */
export type Rect = { x: number; y: number; width: number; height: number }

type VideoSlotState = {
  /** Where the player screen wants the video; null while that screen is not showing it. */
  slot: Rect | null
  setSlot: (slot: Rect | null) => void
}

const sameRect = (a: Rect | null, b: Rect | null): boolean =>
  a === b ||
  (a !== null &&
    b !== null &&
    a.x === b.x &&
    a.y === b.y &&
    a.width === b.width &&
    a.height === b.height)

/**
 * The YouTube player lives above every screen, so that the video keeps playing when the player
 * screen is closed. While that screen is open it reserves a slot, and the video sits in it.
 */
export const useVideoSlotStore = create<VideoSlotState>()((set, get) => ({
  slot: null,
  setSlot: (slot) => {
    if (!sameRect(get().slot, slot)) set({ slot })
  },
}))
