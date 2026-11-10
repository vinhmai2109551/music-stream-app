import { describe, expect, it } from "vitest"
import {
  activeIndex,
  applyTap,
  emptyMarks,
  markedCount,
  marksFromTimings,
  nextPending,
  nudge,
  toTimings,
  undoTap,
  type Marks,
} from "./tap-sync"

const LINES = ["Một", "Hai", "", "Ba", "Bốn"]

/** Taps `times` in turn; every tap must be accepted. */
function tapAll(lines: readonly string[], times: number[], from: Marks = emptyMarks(lines)): Marks {
  return times.reduce<Marks>((marks, time) => {
    const next = applyTap(lines, marks, time)
    if (next === null) throw new Error(`tap at ${time} was refused`)
    return next
  }, from)
}

describe("applyTap", () => {
  it("marks the lines in order", () => {
    expect(tapAll(LINES, [1000, 2000])).toEqual([1000, 2000, null, null, null])
  })

  it("gives a blank line the time of the next line with words", () => {
    expect(tapAll(LINES, [1000, 2000, 5000])).toEqual([1000, 2000, 5000, 5000, null])
  })

  it("skips blank lines at the start and between lines", () => {
    const lines = ["", "Một", "", "", "Hai"]

    expect(tapAll(lines, [1000, 4000])).toEqual([1000, 1000, 4000, 4000, 4000])
  })

  it("refuses a tap that is not later than the previous mark (the song was rewound)", () => {
    const marks = tapAll(LINES, [1000, 2000])

    expect(applyTap(LINES, marks, 2000)).toBeNull()
    expect(applyTap(LINES, marks, 1500)).toBeNull()
    expect(applyTap(LINES, marks, 2001)).not.toBeNull()
  })

  it("does nothing when every line has its mark", () => {
    const marks = tapAll(LINES, [1000, 2000, 3000, 4000])

    expect(applyTap(LINES, marks, 9000)).toBeNull()
  })

  it("does not change the marks it was given", () => {
    const marks = emptyMarks(LINES)

    applyTap(LINES, marks, 1000)

    expect(marks).toEqual([null, null, null, null, null])
  })
})

describe("nextPending", () => {
  it("is the first line with words that has no mark", () => {
    expect(nextPending(LINES, emptyMarks(LINES))).toBe(0)
    expect(nextPending(LINES, tapAll(LINES, [1000, 2000]))).toBe(3)
  })

  it("is null when nothing waits", () => {
    expect(nextPending(LINES, tapAll(LINES, [1, 2, 3, 4]))).toBeNull()
    expect(nextPending([], [])).toBeNull()
  })

  it("is null for a text of blank lines", () => {
    expect(nextPending(["", ""], emptyMarks(["", ""]))).toBeNull()
  })
})

describe("undoTap", () => {
  it("takes back the last mark", () => {
    const marks = tapAll(LINES, [1000, 2000])

    expect(undoTap(LINES, marks)).toEqual([1000, null, null, null, null])
  })

  it("takes back the blank lines that went with the mark", () => {
    const marks = tapAll(LINES, [1000, 2000, 5000])

    expect(undoTap(LINES, marks)).toEqual([1000, 2000, null, null, null])
  })

  it("does nothing when nothing is marked", () => {
    const marks = emptyMarks(LINES)

    expect(undoTap(LINES, marks)).toEqual(marks)
  })

  it("lets the same line be tapped again at another time", () => {
    const marks = undoTap(LINES, tapAll(LINES, [1000, 2000]))

    expect(tapAll(LINES, [2500], marks)).toEqual([1000, 2500, null, null, null])
  })

  it("can take back everything, one tap at a time", () => {
    let marks = tapAll(LINES, [1000, 2000, 5000, 6000])
    for (let i = 0; i < 4; i += 1) marks = undoTap(LINES, marks)

    expect(marks).toEqual(emptyMarks(LINES))
  })
})

describe("toTimings", () => {
  it("gives a time for every line once every line with words is marked", () => {
    expect(toTimings(LINES, tapAll(LINES, [1000, 2000, 5000, 6000]))).toEqual([
      1000, 2000, 5000, 5000, 6000,
    ])
  })

  it("is null while a line with words has no mark", () => {
    expect(toTimings(LINES, tapAll(LINES, [1000, 2000]))).toBeNull()
  })

  it("gives blank lines at the end the time of the last line with words", () => {
    const lines = ["Một", "Hai", "", ""]

    expect(toTimings(lines, tapAll(lines, [1000, 2000]))).toEqual([1000, 2000, 2000, 2000])
  })

  it("is null when the marks do not fit the lines", () => {
    expect(toTimings(["a", "b"], [1000])).toBeNull()
  })
})

describe("marksFromTimings", () => {
  it("starts from saved timings so a song can be corrected", () => {
    expect(marksFromTimings(["a", "b"], [100, 200])).toEqual([100, 200])
  })

  it("starts empty when there are no timings or they do not fit", () => {
    expect(marksFromTimings(["a", "b"], null)).toEqual([null, null])
    expect(marksFromTimings(["a", "b"], [100])).toEqual([null, null])
  })
})

describe("markedCount", () => {
  it("counts the lines with words that have a mark", () => {
    expect(markedCount(LINES, tapAll(LINES, [1000, 2000, 5000]))).toBe(3)
  })
})

describe("activeIndex", () => {
  const timings = [1000, 2000, 2000, 5000]

  it("is -1 before the first line starts", () => {
    expect(activeIndex(timings, 0)).toBe(-1)
    expect(activeIndex(timings, 999)).toBe(-1)
  })

  it("is the last line that has started", () => {
    expect(activeIndex(timings, 1000)).toBe(0)
    expect(activeIndex(timings, 1999)).toBe(0)
    expect(activeIndex(timings, 4999)).toBe(2)
    expect(activeIndex(timings, 99_000)).toBe(3)
  })

  it("is -1 without timings", () => {
    expect(activeIndex([], 5000)).toBe(-1)
  })
})

describe("nudge", () => {
  it("moves one time and leaves the others", () => {
    expect(nudge([1000, 2000, 3000], 1, 100)).toEqual([1000, 2100, 3000])
    expect(nudge([1000, 2000, 3000], 1, -100)).toEqual([1000, 1900, 3000])
  })

  it("never goes below zero", () => {
    expect(nudge([50, 2000], 0, -100)).toEqual([0, 2000])
  })
})
