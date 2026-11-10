import { describe, expect, it } from "vitest"
import { parseYouTubeVideoId, youtubeEmbedUrl, youtubeWatchUrl } from "./youtube"

const ID = "dQw4w9WgXcQ"

describe("parseYouTubeVideoId", () => {
  it.each([
    ["a bare id", ID],
    ["a bare id with spaces around", `  ${ID}  `],
    ["a watch link", `https://www.youtube.com/watch?v=${ID}`],
    ["a watch link with other parameters", `https://www.youtube.com/watch?list=PL1&v=${ID}&t=30s`],
    ["a watch link without the scheme", `youtube.com/watch?v=${ID}`],
    ["a mobile link", `https://m.youtube.com/watch?v=${ID}`],
    ["a music link", `https://music.youtube.com/watch?v=${ID}&si=abc`],
    ["a short link", `https://youtu.be/${ID}`],
    ["a short link with a tracking parameter", `https://youtu.be/${ID}?si=xyz&t=10`],
    ["an embed link", `https://www.youtube.com/embed/${ID}`],
    ["a nocookie embed link", `https://www.youtube-nocookie.com/embed/${ID}?start=5`],
    ["a shorts link", `https://www.youtube.com/shorts/${ID}`],
    ["a live link", `https://www.youtube.com/live/${ID}`],
  ])("reads %s", (_name, input) => {
    expect(parseYouTubeVideoId(input)).toBe(ID)
  })

  it("keeps the dash and underscore of an id", () => {
    expect(parseYouTubeVideoId("a-b_c-d_e-f")).toBe("a-b_c-d_e-f")
  })

  it.each([
    ["nothing", ""],
    ["text that is not a link", "hello world"],
    ["an id that is too short", "abc123"],
    ["an id that is too long", `${ID}X`],
    ["a watch link without a video", "https://www.youtube.com/watch"],
    ["a watch link with a broken id", "https://www.youtube.com/watch?v=short"],
    ["a playlist link", "https://www.youtube.com/playlist?list=PL12345678901"],
    ["a channel link", "https://www.youtube.com/@someone"],
    ["a link of another site that has the id in it", `https://example.com/watch?v=${ID}`],
  ])("gives null for %s", (_name, input) => {
    expect(parseYouTubeVideoId(input)).toBeNull()
  })
})

describe("embed and watch urls", () => {
  it("keep a real id as it is", () => {
    expect(youtubeEmbedUrl(ID)).toBe(`https://www.youtube-nocookie.com/embed/${ID}`)
    expect(youtubeWatchUrl("a-b_c-d_e-f")).toBe("https://www.youtube.com/watch?v=a-b_c-d_e-f")
  })

  it("never let an odd value change the path or the query of the address", () => {
    expect(youtubeEmbedUrl("../x?y=1&z=2")).toBe(
      "https://www.youtube-nocookie.com/embed/..%2Fx%3Fy%3D1%26z%3D2",
    )
    expect(youtubeWatchUrl("a&b=c")).toBe("https://www.youtube.com/watch?v=a%26b%3Dc")
  })
})
