import { describe, expect, it } from "@jest/globals"
import { cleanList, quotesLongPassage, toArtistMetadata, toTrackSuggestion } from "./sanitize.js"

describe("cleanList", () => {
  it("trims, collapses spaces, drops blanks and repeats (ignoring case) and keeps the order", () => {
    expect(cleanList(["  nhạc  buồn ", "", "   ", "Nhạc buồn", "piano", "NHẠC BUỒN"], 10)).toEqual([
      "nhạc buồn",
      "piano",
    ])
  })

  it("drops entries that are not text or are longer than 40 characters", () => {
    expect(cleanList([1, null, { a: 1 }, "x".repeat(41), "x".repeat(40)], 10)).toEqual([
      "x".repeat(40),
    ])
  })

  it("keeps at most `max` entries", () => {
    expect(cleanList(["a", "b", "c", "d"], 2)).toEqual(["a", "b"])
  })

  it("gives an empty list for anything that is not a list", () => {
    expect(cleanList("pop", 5)).toEqual([])
    expect(cleanList(undefined, 5)).toEqual([])
    expect(cleanList({ 0: "a" }, 5)).toEqual([])
  })
})

describe("quotesLongPassage", () => {
  it("is false for a plain description and for a short quoted title", () => {
    expect(quotesLongPassage("Một bản ballad nhẹ nhàng, hợp nghe lúc mưa.")).toBe(false)
    expect(quotesLongPassage('Bài hát "Hãy Trao Cho Anh" nổi tiếng nhờ giai điệu bắt tai.')).toBe(
      false,
    )
  })

  it.each([
    ['Câu hát "em đi rồi anh ở lại một mình trong đêm nay" là điểm nhấn'],
    ["Lời “chạy ngay đi trước khi toàn bộ thế giới tan biến mất” rất ấn tượng"],
    ["« một hai ba bốn năm sáu bảy » được lặp lại"],
  ])("is true for a quoted passage of more than 5 words: %s", (text) => {
    expect(quotesLongPassage(text)).toBe(true)
  })

  it("counts exactly 5 quoted words as fine", () => {
    expect(quotesLongPassage('Tên bản "một hai ba bốn năm" khá dài')).toBe(false)
  })
})

describe("toTrackSuggestion", () => {
  const raw = {
    genres: ["v-pop", "Ballad"],
    mood: ["buồn"],
    tags: ["ngày mưa"],
    description: "  Bản ballad   nhẹ nhàng. ",
    language: "VI",
    confidence: "high",
  }

  it("turns a model answer into clean metadata", () => {
    expect(toTrackSuggestion(raw)).toEqual({
      metadata: {
        genres: ["v-pop", "Ballad"],
        mood: ["buồn"],
        tags: ["ngày mưa"],
        description: "Bản ballad nhẹ nhàng.",
        language: "vi",
      },
      confidence: "high",
      descriptionDropped: false,
    })
  })

  it("caps the lists below what the API allows, so a chatty model cannot overflow them", () => {
    const many = Array.from({ length: 20 }, (_, index) => `w${index}`)

    const { metadata } = toTrackSuggestion({ ...raw, genres: many, mood: many, tags: many })

    expect(metadata.genres).toHaveLength(5)
    expect(metadata.mood).toHaveLength(5)
    expect(metadata.tags).toHaveLength(8)
  })

  it("cuts a too long description at a word, within the limit", () => {
    const { metadata } = toTrackSuggestion({ ...raw, description: "từ ".repeat(400) })

    expect(metadata.description.length).toBeLessThanOrEqual(600)
    expect(metadata.description.endsWith("từ")).toBe(true)
  })

  it("drops a description that quotes a long passage, and says so", () => {
    const result = toTrackSuggestion({
      ...raw,
      description: 'Điệp khúc "em đi rồi anh ở lại một mình trong đêm nay" rất buồn',
    })

    expect(result.metadata.description).toBe("")
    expect(result.descriptionDropped).toBe(true)
  })

  it.each([["none"], [""], ["Vietnamese"], ["v"], [null], [undefined], [7]])(
    "turns the language %j into null",
    (language) => {
      expect(toTrackSuggestion({ ...raw, language }).metadata.language).toBeNull()
    },
  )

  it("treats a missing or unknown confidence as low", () => {
    expect(toTrackSuggestion({ ...raw, confidence: undefined }).confidence).toBe("low")
    expect(toTrackSuggestion({ ...raw, confidence: "certain" }).confidence).toBe("low")
    expect(toTrackSuggestion({ ...raw, confidence: "medium" }).confidence).toBe("medium")
  })

  it("copes with an answer that has nothing usable", () => {
    expect(toTrackSuggestion({})).toEqual({
      metadata: { genres: [], mood: [], tags: [], description: "", language: null },
      confidence: "low",
      descriptionDropped: false,
    })
  })
})

describe("toArtistMetadata", () => {
  it("cleans the genres", () => {
    expect(toArtistMetadata({ genres: [" pop ", "pop", "rock"] })).toEqual({
      genres: ["pop", "rock"],
    })
    expect(toArtistMetadata({})).toEqual({ genres: [] })
  })
})
