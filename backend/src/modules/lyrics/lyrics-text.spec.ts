import { describe, expect, it } from "@jest/globals"
import { hasWords, lyricsContentHash, normalizeLines, totalCharacters } from "./lyrics-text.js"

describe("normalizeLines", () => {
  it("keeps the lines and the blank lines between verses where they are", () => {
    expect(normalizeLines(["a", "", "b"])).toEqual(["a", "", "b"])
  })

  it("starts a new line at a line break inside a text, whatever the break is", () => {
    expect(normalizeLines(["a\nb", "c\r\nd", "e\rf"])).toEqual(["a", "b", "c", "d", "e", "f"])
  })

  it("cuts spaces at the end of a line, not at the start", () => {
    expect(normalizeLines(["  a  ", "b\t"])).toEqual(["  a", "b"])
  })

  it("drops the blank lines at the very end only", () => {
    expect(normalizeLines(["a", "", "b", "", "   ", ""])).toEqual(["a", "", "b"])
    expect(normalizeLines(["", "a"])).toEqual(["", "a"])
  })

  it("makes nothing of nothing", () => {
    expect(normalizeLines([])).toEqual([])
    expect(normalizeLines(["", " "])).toEqual([])
  })
})

describe("hasWords and totalCharacters", () => {
  it("tells lyrics from blank lines", () => {
    expect(hasWords(["", "  ", "a"])).toBe(true)
    expect(hasWords(["", "  "])).toBe(false)
    expect(hasWords([])).toBe(false)
  })

  it("counts the characters of the lines", () => {
    expect(totalCharacters(["ab", "", "cde"])).toBe(5)
  })
})

describe("lyricsContentHash", () => {
  it("is the same for the same language and lines", () => {
    expect(lyricsContentHash("vi", ["a", "b"])).toBe(lyricsContentHash("vi", ["a", "b"]))
  })

  it("changes with a line, with the order, with a blank line and with the language", () => {
    const base = lyricsContentHash("vi", ["a", "b"])
    expect(lyricsContentHash("vi", ["a", "c"])).not.toBe(base)
    expect(lyricsContentHash("vi", ["b", "a"])).not.toBe(base)
    expect(lyricsContentHash("vi", ["a", "", "b"])).not.toBe(base)
    expect(lyricsContentHash("ko", ["a", "b"])).not.toBe(base)
  })

  it("does not mix the language into the lines", () => {
    expect(lyricsContentHash("vi", ["x"])).not.toBe(lyricsContentHash("v", ["ix"]))
  })
})
