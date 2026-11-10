import { describe, expect, it } from "vitest"
import {
  draftReducer,
  draftToSave,
  initialDraftState,
  isDirty,
  type DraftAction,
  type DraftState,
  type SavedLyrics,
} from "./draft"

const run = (state: DraftState, ...actions: DraftAction[]): DraftState =>
  actions.reduce(draftReducer, state)

const SAVED: SavedLyrics = { language: "vi", lines: ["Một", "", "Hai"], timingsMs: null }
const loaded = (lyrics: SavedLyrics | null = SAVED) =>
  run(initialDraftState(), { type: "loaded", lyrics, defaultLanguage: "vi" })

describe("loading", () => {
  it("starts empty for a track without lyrics", () => {
    const state = loaded(null)

    expect(state.draft).toMatchObject({ language: "vi", lines: [], timingsMs: null })
    expect(state.saved).toBeNull()
    expect(isDirty(state)).toBe(false)
  })

  it("starts from the saved lyrics, not dirty", () => {
    const state = loaded()

    expect(state.draft.lines).toEqual(["Một", "", "Hai"])
    expect(isDirty(state)).toBe(false)
  })

  it("takes the first marks from saved timings", () => {
    const state = loaded({ ...SAVED, timingsMs: [1000, 2000, 2000] })

    expect(state.draft.marks).toEqual([1000, 2000, 2000])
  })
})

describe("applyText", () => {
  it("keeps the timings when the number of lines stays (a typo was fixed)", () => {
    const state = run(loaded({ ...SAVED, timingsMs: [1000, 2000, 2000] }), {
      type: "applyText",
      lines: ["Mốt", "", "Hai"],
    })

    expect(state.draft.timingsMs).toEqual([1000, 2000, 2000])
    expect(state.draft.lines[0]).toBe("Mốt")
  })

  it("drops the timings when the number of lines changes", () => {
    const state = run(loaded({ ...SAVED, timingsMs: [1000, 2000, 2000] }), {
      type: "applyText",
      lines: ["Một", "Hai"],
    })

    expect(state.draft.timingsMs).toBeNull()
    expect(state.draft.marks).toEqual([null, null])
  })
})

describe("tap sync", () => {
  const fresh = () => run(loaded(), { type: "setLanguage", language: "vi" })

  it("marks the lines in order and gives the song timings once every line has one", () => {
    const state = run(fresh(), { type: "tap", timeMs: 1000 }, { type: "tap", timeMs: 4000 })

    expect(state.draft.marks).toEqual([1000, 4000, 4000])
    expect(state.draft.timingsMs).toEqual([1000, 4000, 4000])
  })

  it("has no timings while a line is still waiting", () => {
    const state = run(fresh(), { type: "tap", timeMs: 1000 })

    expect(state.draft.timingsMs).toBeNull()
    expect(state.draft.marks).toEqual([1000, null, null])
  })

  it("refuses a tap that is not later than the previous one", () => {
    const state = run(fresh(), { type: "tap", timeMs: 1000 }, { type: "tap", timeMs: 900 })

    expect(state.draft.marks).toEqual([1000, null, null])
  })

  it("takes back the last tap, and the timings with it", () => {
    const done = run(fresh(), { type: "tap", timeMs: 1000 }, { type: "tap", timeMs: 4000 })
    const state = run(done, { type: "undoTap" })

    expect(state.draft.marks).toEqual([1000, null, null])
    expect(state.draft.timingsMs).toBeNull()
  })

  it("starts over on reset", () => {
    const done = run(fresh(), { type: "tap", timeMs: 1000 }, { type: "tap", timeMs: 4000 })
    const state = run(done, { type: "resetSync" })

    expect(state.draft.marks).toEqual([null, null, null])
    expect(state.draft.timingsMs).toBeNull()
  })

  it("cannot tap again before a reset once the song is synced", () => {
    const done = run(fresh(), { type: "tap", timeMs: 1000 }, { type: "tap", timeMs: 4000 })
    const state = run(done, { type: "tap", timeMs: 9000 })

    expect(state.draft.timingsMs).toEqual([1000, 4000, 4000])
  })
})

describe("fine tuning", () => {
  const synced = () => loaded({ ...SAVED, timingsMs: [1000, 2000, 2000] })

  it("moves one time by a tenth of a second", () => {
    const state = run(synced(), { type: "nudge", index: 0, deltaMs: 100 })

    expect(state.draft.timingsMs).toEqual([1100, 2000, 2000])
    expect(state.draft.marks).toEqual([1100, 2000, 2000])
  })

  it("never moves a time below zero", () => {
    const state = run(synced(), { type: "nudge", index: 0, deltaMs: -5000 })

    expect(state.draft.timingsMs?.[0]).toBe(0)
  })

  it("sets a time typed by hand, in whole milliseconds", () => {
    const state = run(synced(), { type: "setTiming", index: 1, timeMs: 2345.6 })

    expect(state.draft.timingsMs?.[1]).toBe(2346)
  })

  it("does nothing to timings that do not exist", () => {
    const state = loaded()

    expect(run(state, { type: "nudge", index: 0, deltaMs: 100 })).toBe(state)
    expect(run(state, { type: "setTiming", index: 0, timeMs: 100 })).toBe(state)
  })

  it("edits the text of one line", () => {
    const state = run(synced(), { type: "setLine", index: 2, text: "Hai!" })

    expect(state.draft.lines).toEqual(["Một", "", "Hai!"])
    expect(state.draft.timingsMs).toEqual([1000, 2000, 2000])
  })
})

describe("import", () => {
  it("replaces the lines and the timings", () => {
    const state = run(loaded(), { type: "import", lines: ["a", "b"], timingsMs: [10, 20] })

    expect(state.draft).toMatchObject({ lines: ["a", "b"], timingsMs: [10, 20], marks: [10, 20] })
  })

  it("takes plain lines without timings", () => {
    const state = run(loaded(), { type: "import", lines: ["a", "b"], timingsMs: null })

    expect(state.draft.timingsMs).toBeNull()
  })
})

describe("isDirty, draftToSave, saved and revert", () => {
  it("is dirty after any change, and clean again after saving", () => {
    const edited = run(loaded(), { type: "setLine", index: 0, text: "Mốt" })
    expect(isDirty(edited)).toBe(true)

    const saved = run(edited, {
      type: "saved",
      lyrics: { language: "vi", lines: ["Mốt", "", "Hai"], timingsMs: null },
    })
    expect(isDirty(saved)).toBe(false)
  })

  it("is dirty when only the language or only the timings changed", () => {
    expect(isDirty(run(loaded(), { type: "setLanguage", language: "ko" }))).toBe(true)
    expect(
      isDirty(run(loaded(), { type: "import", lines: SAVED.lines, timingsMs: [1, 2, 2] })),
    ).toBe(true)
  })

  it("is not dirty for blank lines at the end, which the API drops", () => {
    const state = run(loaded(), { type: "applyText", lines: ["Một", "", "Hai", "", ""] })

    expect(isDirty(state)).toBe(false)
  })

  it("is dirty for a new text on a track without lyrics, not for an empty one", () => {
    expect(isDirty(loaded(null))).toBe(false)
    expect(isDirty(run(loaded(null), { type: "applyText", lines: ["xin chào"] }))).toBe(true)
    expect(isDirty(run(loaded(null), { type: "applyText", lines: ["", " "] }))).toBe(false)
  })

  it("cuts the draft the way the API does before saving, timings included", () => {
    const state = run(loaded(), {
      type: "import",
      lines: ["Một  ", "Hai", "", ""],
      timingsMs: [1, 2, 3, 3],
    })

    expect(draftToSave(state.draft)).toEqual({
      language: "vi",
      lines: ["Một", "Hai"],
      timingsMs: [1, 2],
    })
  })

  it("goes back to the saved lyrics on revert", () => {
    const edited = run(loaded(), { type: "setLine", index: 0, text: "x" })
    const state = run(edited, { type: "revert", defaultLanguage: "vi" })

    expect(state.draft.lines).toEqual(SAVED.lines)
    expect(isDirty(state)).toBe(false)
  })

  it("goes back to nothing on revert when the track had no lyrics", () => {
    const edited = run(loaded(null), { type: "applyText", lines: ["a"] })
    const state = run(edited, { type: "revert", defaultLanguage: "ko" })

    expect(state.draft).toMatchObject({ lines: [], language: "ko" })
  })
})
