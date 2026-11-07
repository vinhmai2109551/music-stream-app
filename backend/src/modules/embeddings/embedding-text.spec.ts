import { describe, expect, it } from "@jest/globals"
import { artistEmbeddingText, contentHash, trackEmbeddingText } from "./embedding-text.js"

const track = {
  title: "Lạc Trôi",
  artist: "Sơn Tùng M-TP",
  region: "VIETNAM",
  genres: ["v-pop", "pop"],
  mood: ["buồn", "huyền ảo"],
  tags: ["ngày mưa", "đàn tranh"],
  description: "Bản nhạc pha chất dân gian, giai điệu cuốn hút.",
}

describe("trackEmbeddingText", () => {
  it("follows the format: title, artist, region, genres, moods, tags, description", () => {
    expect(trackEmbeddingText(track)).toBe(
      "Bài: Lạc Trôi. Nghệ sĩ: Sơn Tùng M-TP. Khu vực: Việt Nam. Thể loại: v-pop, pop. " +
        "Tâm trạng: buồn, huyền ảo. Tag: ngày mưa, đàn tranh. " +
        "Mô tả: Bản nhạc pha chất dân gian, giai điệu cuốn hút..",
    )
  })

  it("leaves out the parts that have nothing in them instead of printing empty labels", () => {
    const text = trackEmbeddingText({
      ...track,
      genres: [],
      mood: [" ", ""],
      tags: [],
      description: "   ",
    })

    expect(text).toBe("Bài: Lạc Trôi. Nghệ sĩ: Sơn Tùng M-TP. Khu vực: Việt Nam.")
  })

  it.each([
    ["VIETNAM", "Việt Nam"],
    ["KOREA", "Hàn Quốc"],
    ["JAPAN", "Nhật Bản"],
    ["CHINA", "Trung Quốc"],
    ["GLOBAL", "Quốc tế"],
  ])("writes the region %s as %s", (region, label) => {
    expect(trackEmbeddingText({ ...track, region })).toContain(`Khu vực: ${label}`)
  })

  it("keeps an unknown region as it is", () => {
    expect(trackEmbeddingText({ ...track, region: "MARS" })).toContain("Khu vực: MARS")
  })

  it("tidies spaces so a harmless edit does not change the text", () => {
    expect(trackEmbeddingText({ ...track, title: "  Lạc   Trôi \n", tags: [" ngày  mưa "] })).toBe(
      trackEmbeddingText({ ...track, title: "Lạc Trôi", tags: ["ngày mưa"] }),
    )
  })

  it("is the same text for the same track every time", () => {
    expect(trackEmbeddingText(track)).toBe(trackEmbeddingText({ ...track }))
  })

  it("changes when anything that describes the track changes", () => {
    const base = trackEmbeddingText(track)
    for (const change of [
      { title: "Khác" },
      { artist: "Khác" },
      { region: "KOREA" },
      { genres: ["rock"] },
      { mood: ["vui"] },
      { tags: ["gym"] },
      { description: "Khác" },
    ]) {
      expect(trackEmbeddingText({ ...track, ...change })).not.toBe(base)
    }
  })
})

describe("artistEmbeddingText", () => {
  const artist = {
    name: "BLACKPINK",
    region: "KOREA",
    genres: ["k-pop"],
    bio: "South Korean girl group formed by YG Entertainment.",
  }

  it("holds the name, region, genres and bio", () => {
    expect(artistEmbeddingText(artist)).toBe(
      "Nghệ sĩ: BLACKPINK. Khu vực: Hàn Quốc. Thể loại: k-pop. " +
        "Giới thiệu: South Korean girl group formed by YG Entertainment..",
    )
  })

  it("keeps only the start of a long bio", () => {
    const text = artistEmbeddingText({ ...artist, bio: "x".repeat(2000) })

    expect(text.length).toBeLessThan(600)
  })

  it("leaves out an empty bio and empty genres", () => {
    expect(artistEmbeddingText({ ...artist, genres: [], bio: "" })).toBe(
      "Nghệ sĩ: BLACKPINK. Khu vực: Hàn Quốc.",
    )
  })
})

describe("contentHash", () => {
  it("is a SHA-256 hex string, the same for the same text and model", () => {
    const hash = contentHash("Bài: A.", "model-1")

    expect(hash).toMatch(/^[0-9a-f]{64}$/)
    expect(contentHash("Bài: A.", "model-1")).toBe(hash)
  })

  it("changes with the text and with the model", () => {
    const hash = contentHash("Bài: A.", "model-1")

    expect(contentHash("Bài: B.", "model-1")).not.toBe(hash)
    expect(contentHash("Bài: A.", "model-2")).not.toBe(hash)
  })

  it("cannot be fooled by moving a character from the text to the model name", () => {
    expect(contentHash("ab", "c")).not.toBe(contentHash("a", "bc"))
  })
})
