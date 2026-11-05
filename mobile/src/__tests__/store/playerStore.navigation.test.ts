import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals"
import { copy } from "@/constants/copy"
import { RESTART_THRESHOLD_SECONDS } from "@/constants/player"
import { usePlayerStore } from "@/store/playerStore"
import { r2Track } from "../helpers/playback"

const store = usePlayerStore
const state = () => store.getState()
const queue = () => [r2Track("a"), r2Track("b"), r2Track("c")]
const currentId = () => state().currentTrack?.id

beforeEach(() => {
  state().reset()
})
afterEach(() => {
  jest.restoreAllMocks()
})

describe("playFromList", () => {
  it("starts the chosen track from the beginning and remembers the queue", () => {
    const before = state().playVersion
    state().playFromList(queue(), 1, "My playlist")

    expect(currentId()).toBe("b")
    expect(state().queue.map((track) => track.id)).toEqual(["a", "b", "c"])
    expect(state().queueSource).toBe("My playlist")
    expect(state().isPlaying).toBe(true)
    expect(state().isBuffering).toBe(true)
    expect(state().progress).toBe(0)
    expect(state().duration).toBe(200)
    expect(state().playVersion).toBe(before + 1)
  })

  it("uses the default source name and clears an earlier error and skip streak", () => {
    state().playFromList(queue(), 0)
    state().setError("network")

    state().playFromList(queue(), 2)

    expect(state().queueSource).toBe(copy.defaultSource)
    expect(state().error).toBeNull()
    expect(state().skipStreak).toBe(0)
  })

  it("does nothing for an index outside the list", () => {
    const before = state().playVersion
    state().playFromList(queue(), 5)
    state().playFromList([], 0)

    expect(state().currentTrack).toBeNull()
    expect(state().playVersion).toBe(before)
  })
})

describe("togglePlaying and pause", () => {
  it("does nothing without a track", () => {
    state().togglePlaying()

    expect(state().isPlaying).toBe(false)
  })

  it("toggles between playing and paused", () => {
    state().playFromList(queue(), 0)

    state().togglePlaying()
    expect(state().isPlaying).toBe(false)
    state().togglePlaying()
    expect(state().isPlaying).toBe(true)
  })

  it("pause() pauses and stops buffering without toggling", () => {
    state().playFromList(queue(), 0)
    state().pause()
    state().pause()

    expect(state().isPlaying).toBe(false)
    expect(state().isBuffering).toBe(false)
  })
})

describe("next", () => {
  it("moves to the following track", () => {
    state().playFromList(queue(), 0)
    state().next()

    expect(currentId()).toBe("b")
    expect(state().isPlaying).toBe(true)
  })

  it("at the end with repeat off, stops and rewinds the last track", () => {
    state().playFromList(queue(), 2)
    state().setProgress(100)
    const seeks = state().seekVersion

    state().next()

    expect(currentId()).toBe("c")
    expect(state().isPlaying).toBe(false)
    expect(state().progress).toBe(0)
    expect(state().seekVersion).toBe(seeks + 1)
  })

  it("at the end with repeat all, wraps to the first track", () => {
    state().playFromList(queue(), 2)
    state().cycleRepeat() // off -> all
    state().next()

    expect(currentId()).toBe("a")
    expect(state().isPlaying).toBe(true)
  })

  it("with shuffle picks another track of the queue", () => {
    jest.spyOn(Math, "random").mockReturnValue(0)
    state().playFromList(queue(), 0)
    state().toggleShuffle()

    state().next()

    expect(currentId()).toBe("b") // the first of the other tracks
    jest.spyOn(Math, "random").mockReturnValue(0.99)
    state().next()
    expect(currentId()).toBe("c") // the last of the others (a, c)
  })

  it("with shuffle never repeats the current track while there are others", () => {
    state().playFromList(queue(), 0)
    state().toggleShuffle()
    let previous = currentId()

    for (let i = 0; i < 50; i++) {
      state().next()
      expect(currentId()).not.toBe(previous)
      previous = currentId()
    }
  })

  it("does nothing without a track", () => {
    state().next()

    expect(state().currentTrack).toBeNull()
  })

  it("a one-track queue just stops (also with shuffle on)", () => {
    state().playFromList([r2Track("only")], 0)
    state().toggleShuffle()
    state().next()

    expect(currentId()).toBe("only")
    expect(state().isPlaying).toBe(false)
  })
})

describe("previous", () => {
  it("goes back one track when the current one has just started", () => {
    state().playFromList(queue(), 2)
    state().setProgress(RESTART_THRESHOLD_SECONDS)

    state().previous()

    expect(currentId()).toBe("b")
  })

  it("restarts the current track after more than the threshold seconds", () => {
    state().playFromList(queue(), 2)
    state().setProgress(RESTART_THRESHOLD_SECONDS + 0.5)
    const seeks = state().seekVersion

    state().previous()

    expect(currentId()).toBe("c")
    expect(state().progress).toBe(0)
    expect(state().seekVersion).toBe(seeks + 1)
  })

  it("restarts the first track instead of going before it", () => {
    state().playFromList(queue(), 0)
    state().previous()

    expect(currentId()).toBe("a")
    expect(state().progress).toBe(0)
  })

  it("does nothing without a track", () => {
    state().previous()

    expect(state().currentTrack).toBeNull()
  })
})

describe("handleTrackEnd", () => {
  it("repeat one plays the same track again from the start", () => {
    state().playFromList(queue(), 1)
    state().cycleRepeat()
    state().cycleRepeat() // one
    state().setProgress(199)
    const seeks = state().seekVersion

    state().handleTrackEnd()

    expect(currentId()).toBe("b")
    expect(state().progress).toBe(0)
    expect(state().isPlaying).toBe(true)
    expect(state().seekVersion).toBe(seeks + 1)
  })

  it("moves on to the next track", () => {
    state().playFromList(queue(), 0)
    state().handleTrackEnd()

    expect(currentId()).toBe("b")
  })

  it("stops after the last track when repeat is off", () => {
    state().playFromList(queue(), 2)
    state().handleTrackEnd()

    expect(currentId()).toBe("c")
    expect(state().isPlaying).toBe(false)
    expect(state().progress).toBe(0)
  })

  it("starts again from the first track when repeat is all", () => {
    state().playFromList(queue(), 2)
    state().cycleRepeat()
    state().handleTrackEnd()

    expect(currentId()).toBe("a")
    expect(state().isPlaying).toBe(true)
  })

  it("shuffle picks another track, also after the last one when repeating all", () => {
    jest.spyOn(Math, "random").mockReturnValue(0)
    state().playFromList(queue(), 2)
    state().toggleShuffle()
    state().cycleRepeat() // all

    state().handleTrackEnd()

    expect(currentId()).toBe("a")
    expect(state().isPlaying).toBe(true)
  })

  it("shuffle with repeat off still ends the queue at its last position", () => {
    state().playFromList(queue(), 2)
    state().toggleShuffle()

    state().handleTrackEnd()

    expect(currentId()).toBe("c")
    expect(state().isPlaying).toBe(false)
  })

  it("does nothing without a track", () => {
    state().handleTrackEnd()

    expect(state().isPlaying).toBe(false)
  })
})

describe("seek", () => {
  beforeEach(() => state().playFromList(queue(), 0)) // duration 200

  it("moves to the position and tells the engine", () => {
    const seeks = state().seekVersion
    state().seek(42)

    expect(state().progress).toBe(42)
    expect(state().seekVersion).toBe(seeks + 1)
  })

  it("stays between 0 and the duration", () => {
    state().seek(-10)
    expect(state().progress).toBe(0)
    state().seek(9999)
    expect(state().progress).toBe(200)
    state().seek(200)
    expect(state().progress).toBe(200)
  })

  it("when the duration is not known yet, only the lower limit applies", () => {
    state().setDuration(0)
    state().seek(75)

    expect(state().progress).toBe(75)
  })
})

describe("errors and recovery", () => {
  it("setError stops playback and buffering", () => {
    state().playFromList(queue(), 0)
    state().setError("missing")

    expect(state().error).toBe("missing")
    expect(state().isPlaying).toBe(false)
    expect(state().isBuffering).toBe(false)
  })

  it("retry clears the error and asks the engine to load again", () => {
    state().playFromList(queue(), 0)
    state().setError("network")
    const before = state().playVersion

    state().retry()

    expect(state().error).toBeNull()
    expect(state().isPlaying).toBe(true)
    expect(state().isBuffering).toBe(true)
    expect(state().playVersion).toBe(before + 1)
  })

  it("skipAfterError says no when there is nothing to move to, and changes nothing", () => {
    state().playFromList([r2Track("only")], 0)

    expect(state().skipAfterError()).toBe(false)
    expect(state().skipStreak).toBe(0)
    expect(currentId()).toBe("only")
  })

  it("skipAfterError stops once every other track failed in a row", () => {
    state().playFromList(queue(), 0)

    expect(state().skipAfterError()).toBe(true) // a -> b
    expect(state().skipAfterError()).toBe(true) // b -> c
    expect(state().skipAfterError()).toBe(false) // all other tracks failed
    expect(currentId()).toBe("c")
  })
})

describe("modes and housekeeping", () => {
  it("cycles the repeat mode off -> all -> one -> off", () => {
    expect(state().repeat).toBe("off")
    state().cycleRepeat()
    expect(state().repeat).toBe("all")
    state().cycleRepeat()
    expect(state().repeat).toBe("one")
    state().cycleRepeat()
    expect(state().repeat).toBe("off")
  })

  it("toggles shuffle", () => {
    state().toggleShuffle()
    expect(state().shuffle).toBe(true)
    state().toggleShuffle()
    expect(state().shuffle).toBe(false)
  })

  it("reports engine values", () => {
    state().setDuration(321)
    state().setBuffering(true)
    state().setProgress(12)

    expect(state()).toMatchObject({ duration: 321, isBuffering: true, progress: 12 })
  })

  it("reset() empties the queue and stops everything", () => {
    state().playFromList(queue(), 1, "Somewhere")
    state().toggleShuffle()
    state().cycleRepeat()
    state().setError("blocked")

    state().reset()

    expect(state()).toMatchObject({
      queue: [],
      currentTrack: null,
      isPlaying: false,
      progress: 0,
      duration: 0,
      shuffle: false,
      repeat: "off",
      queueSource: copy.defaultSource,
      source: "none",
      error: null,
      skipStreak: 0,
    })
  })
})
