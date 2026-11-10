import { describe, expect, it } from "vitest"
import { normalizeDraft, splitLines } from "./lyrics-text"
import { validateLyrics, validateTimings } from "./lyrics-validation"

const OK = { language: "vi", lines: ["Một", "", "Hai"], timingsMs: [1000, 2000, 2000] }

describe("splitLines", () => {
  it("makes one element per line, cutting spaces at the end and keeping blank lines", () => {
    expect(splitLines("Một  \r\n\r\nHai\nBa")).toEqual(["Một", "", "Hai", "Ba"])
  })
})

describe("normalizeDraft", () => {
  it("drops blank lines at the end together with their timings, like the API does", () => {
    const draft = normalizeDraft({ lines: ["Một", "Hai", "", " "], timingsMs: [1, 2, 2, 2] })

    expect(draft).toEqual({ lines: ["Một", "Hai"], timingsMs: [1, 2] })
  })

  it("keeps blank lines in the middle", () => {
    expect(normalizeDraft({ lines: ["Một", "", "Hai"], timingsMs: [1, 2, 2] })).toEqual({
      lines: ["Một", "", "Hai"],
      timingsMs: [1, 2, 2],
    })
  })

  it("drops timings that do not fit the lines", () => {
    expect(normalizeDraft({ lines: ["Một", "Hai"], timingsMs: [1] }).timingsMs).toBeNull()
  })

  it("works without timings", () => {
    expect(normalizeDraft({ lines: ["Một", ""], timingsMs: null })).toEqual({
      lines: ["Một"],
      timingsMs: null,
    })
  })
})

describe("validateLyrics", () => {
  it("accepts good lyrics, with and without timings", () => {
    expect(validateLyrics(OK)).toEqual([])
    expect(validateLyrics({ ...OK, timingsMs: null })).toEqual([])
  })

  it("asks for a language the app has", () => {
    expect(validateLyrics({ ...OK, language: "fr" })).toHaveLength(1)
    expect(validateLyrics({ ...OK, language: "" })).toHaveLength(1)
  })

  it("refuses lyrics without words", () => {
    expect(validateLyrics({ ...OK, lines: ["", " "], timingsMs: null })).not.toEqual([])
  })

  it("refuses too many lines, a line that is too long and too many characters", () => {
    const many = Array.from({ length: 501 }, () => "a")
    expect(validateLyrics({ language: "vi", lines: many, timingsMs: null })).toHaveLength(1)

    const long = ["a".repeat(501)]
    expect(validateLyrics({ language: "vi", lines: long, timingsMs: null })).toHaveLength(1)

    const wide = Array.from({ length: 41 }, () => "a".repeat(500))
    expect(validateLyrics({ language: "vi", lines: wide, timingsMs: null })).toHaveLength(1)
  })
})

describe("validateTimings", () => {
  const lines = ["Một", "", "Hai", "Ba"]

  it("accepts rising times, and a blank line that starts with the line after it", () => {
    expect(validateTimings(lines, [1000, 2000, 2000, 3000])).toEqual([])
  })

  it("refuses a different number of timings", () => {
    expect(validateTimings(lines, [1000, 2000])).toHaveLength(1)
  })

  it("refuses a time that goes back", () => {
    const errors = validateTimings(lines, [1000, 3000, 2000, 4000])

    expect(errors.join(" ")).toMatch(/Dòng 3/)
  })

  it("refuses two lines with words that start at the same time", () => {
    const errors = validateTimings(lines, [1000, 2000, 3000, 3000])

    expect(errors.join(" ")).toMatch(/Dòng 4/)
  })

  it("refuses a negative, fractional or non-numeric time", () => {
    expect(validateTimings(["a"], [-1])).toHaveLength(1)
    expect(validateTimings(["a"], [1.5])).toHaveLength(1)
    expect(validateTimings(["a"], [Number.NaN])).toHaveLength(1)
  })

  it("accepts a first line that starts at zero", () => {
    expect(validateTimings(["a", "b"], [0, 10])).toEqual([])
  })

  it("lists only the first few problems", () => {
    const many = Array.from({ length: 20 }, (_, i) => `l${i}`)
    const errors = validateTimings(
      many,
      many.map(() => 5000),
    )

    expect(errors.length).toBe(4)
    expect(errors[3]).toMatch(/khác/)
  })
})
