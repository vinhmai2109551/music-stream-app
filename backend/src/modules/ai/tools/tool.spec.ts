import { describe, expect, it } from "@jest/globals"
import { enumArg, idsArg, intArg, textArg, ToolInputError } from "./tool.js"

describe("textArg", () => {
  it("trims the text", () => {
    expect(textArg({ q: "  mưa  " }, "q", { max: 10 })).toBe("mưa")
  })

  it("refuses a missing, empty or non-text argument", () => {
    expect(() => textArg({}, "q", { max: 10 })).toThrow(/"q" is required/)
    expect(() => textArg({ q: null }, "q", { max: 10 })).toThrow(ToolInputError)
    expect(() => textArg({ q: "   " }, "q", { max: 10 })).toThrow(/must not be empty/)
    expect(() => textArg({ q: 5 }, "q", { max: 10 })).toThrow(/must be a text/)
  })

  it("refuses a text that is too long, and takes one of exactly the maximum", () => {
    expect(() => textArg({ q: "x".repeat(11) }, "q", { max: 10 })).toThrow(/at most 10/)
    expect(textArg({ q: "x".repeat(10) }, "q", { max: 10 })).toBe("x".repeat(10))
  })

  it("gives undefined for an optional text that is missing or blank", () => {
    expect(textArg({}, "d", { max: 10, optional: true })).toBeUndefined()
    expect(textArg({ d: "  " }, "d", { max: 10, optional: true })).toBeUndefined()
    expect(textArg({ d: "ok" }, "d", { max: 10, optional: true })).toBe("ok")
  })
})

describe("intArg", () => {
  const rules = { min: 1, max: 10, fallback: 6 }

  it("uses the fallback when it is missing", () => {
    expect(intArg({}, "n", rules)).toBe(6)
    expect(intArg({ n: null }, "n", rules)).toBe(6)
  })

  it("takes a whole number within the range, ends included", () => {
    expect(intArg({ n: 1 }, "n", rules)).toBe(1)
    expect(intArg({ n: 10 }, "n", rules)).toBe(10)
  })

  it.each([[0], [11], [-3], [2.5], ["5"], [true], [Number.NaN]])("refuses %p", (value) => {
    expect(() => intArg({ n: value }, "n", rules)).toThrow(ToolInputError)
  })
})

describe("enumArg", () => {
  const allowed = ["track", "artist"] as const

  it("takes one of the values, or the fallback when it is missing or blank", () => {
    expect(enumArg({ t: "artist" }, "t", allowed, "track")).toBe("artist")
    expect(enumArg({}, "t", allowed, "track")).toBe("track")
    expect(enumArg({ t: "" }, "t", allowed, "track")).toBe("track")
    expect(enumArg({}, "t", allowed)).toBeUndefined()
  })

  it("refuses anything else and says what is allowed", () => {
    expect(() => enumArg({ t: "lyrics" }, "t", allowed)).toThrow(/one of: track, artist/)
    expect(() => enumArg({ t: 3 }, "t", allowed)).toThrow(ToolInputError)
  })
})

describe("idsArg", () => {
  it("takes a list of ids, without duplicates and in order", () => {
    expect(idsArg({ ids: ["b", "a", "b", " c "] }, "ids", { min: 1, max: 5 })).toEqual([
      "b",
      "a",
      "c",
    ])
  })

  it("refuses a list that is missing, not a list, or holds something that is not an id", () => {
    expect(() => idsArg({}, "ids", { min: 1, max: 5 })).toThrow(/required/)
    expect(() => idsArg({ ids: "a" }, "ids", { min: 1, max: 5 })).toThrow(/list of ids/)
    expect(() => idsArg({ ids: ["a", 1] }, "ids", { min: 1, max: 5 })).toThrow(/ids as texts/)
    expect(() => idsArg({ ids: [""] }, "ids", { min: 1, max: 5 })).toThrow(ToolInputError)
    expect(() => idsArg({ ids: ["x".repeat(101)] }, "ids", { min: 1, max: 5 })).toThrow(
      ToolInputError,
    )
  })

  it("holds between min and max ids, counted after duplicates are gone", () => {
    expect(() => idsArg({ ids: [] }, "ids", { min: 1, max: 5 })).toThrow(/at least 1/)
    expect(() => idsArg({ ids: ["a", "a"] }, "ids", { min: 2, max: 5 })).toThrow(/at least 2/)
    const six = ["1", "2", "3", "4", "5", "6"]
    expect(() => idsArg({ ids: six }, "ids", { min: 1, max: 5 })).toThrow(/at most 5/)
    expect(idsArg({ ids: six.slice(0, 5) }, "ids", { min: 1, max: 5 })).toHaveLength(5)
  })

  it("lets an optional list be missing", () => {
    expect(idsArg({}, "ids", { min: 0, max: 5 })).toEqual([])
    expect(idsArg({ ids: [] }, "ids", { min: 0, max: 5 })).toEqual([])
  })
})
