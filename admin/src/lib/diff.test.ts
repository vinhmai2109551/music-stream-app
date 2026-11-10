import { describe, expect, it } from "vitest"
import { pickChanged } from "./diff"

describe("pickChanged", () => {
  it("keeps only the fields that changed", () => {
    const original = { title: "A", coverUrl: "https://x/c.jpg", genres: ["pop"] }

    expect(
      pickChanged(original, { title: "B", coverUrl: "https://x/c.jpg", genres: ["pop"] }),
    ).toEqual({
      title: "B",
    })
  })

  it("compares lists by content and order", () => {
    expect(pickChanged({ tags: ["a", "b"] }, { tags: ["a", "b"] })).toEqual({})
    expect(pickChanged({ tags: ["a", "b"] }, { tags: ["b", "a"] })).toEqual({ tags: ["b", "a"] })
    expect(pickChanged({ tags: ["a"] }, { tags: [] })).toEqual({ tags: [] })
  })

  it("treats an empty field and a missing one as the same", () => {
    expect(pickChanged({ audioUrl: null }, { audioUrl: "" })).toEqual({})
    expect(pickChanged({}, { description: undefined })).toEqual({})
    expect(pickChanged({ language: null }, { language: "vi" })).toEqual({ language: "vi" })
  })

  it("sees a field the person cleared", () => {
    expect(pickChanged({ youtubeVideoId: "AAAAAAAAAAA" }, { youtubeVideoId: null })).toEqual({
      youtubeVideoId: null,
    })
  })

  it("keeps everything when there is no original", () => {
    expect(pickChanged(undefined, { a: 1, b: "x" })).toEqual({ a: 1, b: "x" })
  })
})
