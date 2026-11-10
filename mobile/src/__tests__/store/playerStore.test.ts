import { beforeEach, describe, expect, it } from "@jest/globals"
import { canAutoSkip, usePlayerStore } from "@/store/playerStore"
import { noSourceTrack, r2Track, ytTrack } from "../helpers/playback"

const store = usePlayerStore

describe("playerStore", () => {
  beforeEach(() => store.getState().reset())

  it("picks the source of each track when it starts", () => {
    store.getState().playFromList([ytTrack("a"), r2Track("b"), noSourceTrack("c")], 0)
    expect(store.getState().source).toBe("youtube")
    store.getState().next()
    expect(store.getState().source).toBe("r2")
    store.getState().next()
    expect(store.getState().source).toBe("none")
  })

  it("falls back to R2 and bumps the version so the engine reloads", () => {
    store.getState().playFromList([ytTrack("a")], 0)
    const before = store.getState().playVersion
    store.getState().setError("blocked")
    store.getState().fallbackToR2()
    const state = store.getState()
    expect(state.source).toBe("r2")
    expect(state.error).toBe(null)
    expect(state.isPlaying).toBe(true)
    expect(state.playVersion).toBe(before + 1)
  })

  it("stops on an error and retries from the play button", () => {
    store.getState().playFromList([r2Track("a")], 0)
    store.getState().setError("network")
    expect(store.getState().isPlaying).toBe(false)
    const before = store.getState().playVersion
    store.getState().togglePlaying()
    expect(store.getState().error).toBe(null)
    expect(store.getState().isPlaying).toBe(true)
    expect(store.getState().playVersion).toBe(before + 1)
  })

  it("canAutoSkip", () => {
    const list = [r2Track("a"), r2Track("b"), r2Track("c")]
    const at = (index: number, extra = {}) => ({
      queue: list,
      currentTrack: list[index],
      repeat: "off" as const,
      shuffle: false,
      skipStreak: 0,
      ...extra,
    })
    expect(canAutoSkip(at(0))).toBe(true)
    expect(canAutoSkip(at(2))).toBe(false)
    expect(canAutoSkip(at(2, { repeat: "all" }))).toBe(true)
    expect(canAutoSkip(at(2, { shuffle: true }))).toBe(true)
    expect(canAutoSkip(at(0, { skipStreak: 2 }))).toBe(false)
    expect(canAutoSkip({ ...at(0), queue: [list[0]] })).toBe(false)
    expect(canAutoSkip({ ...at(0), currentTrack: null })).toBe(false)
  })

  it("skipAfterError moves on and counts, and a track that plays resets the count", () => {
    store.getState().playFromList([r2Track("a"), r2Track("b"), r2Track("c")], 0)
    expect(store.getState().skipAfterError()).toBe(true)
    expect(store.getState().currentTrack?.id).toBe("b")
    expect(store.getState().skipStreak).toBe(1)
    store.getState().setProgress(0)
    expect(store.getState().skipStreak).toBe(1)
    store.getState().setProgress(3)
    expect(store.getState().skipStreak).toBe(0)
  })
})
