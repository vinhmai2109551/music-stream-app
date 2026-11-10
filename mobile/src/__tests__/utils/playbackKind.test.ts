import { describe, expect, it } from "@jest/globals"
import { getPlaybackKind, youtubeThumbnailUrls, youtubeWatchUrl } from "@/utils/playbackKind"

describe("getPlaybackKind", () => {
  it("prefers the YouTube video, then the audio file, else none", () => {
    expect(getPlaybackKind({ youtubeVideoId: "abc", audioUrl: "https://x/a.mp3" })).toBe("youtube")
    expect(getPlaybackKind({ youtubeVideoId: null, audioUrl: "https://x/a.mp3" })).toBe("r2")
    expect(getPlaybackKind({ youtubeVideoId: "", audioUrl: "https://x/a.mp3" })).toBe("r2")
    expect(getPlaybackKind({ youtubeVideoId: null, audioUrl: "" })).toBe("none")
  })
  it("lists the thumbnails of a video, best first", () => {
    expect(youtubeThumbnailUrls("abc")).toEqual([
      "https://i.ytimg.com/vi/abc/maxresdefault.jpg",
      "https://i.ytimg.com/vi/abc/mqdefault.jpg",
    ])
  })
  it("builds a watch url", () => {
    expect(youtubeWatchUrl("dQw4w9WgXcQ")).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
  })
})
