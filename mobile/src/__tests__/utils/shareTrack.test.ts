import { afterEach, describe, expect, it, jest } from "@jest/globals"
import { Share } from "react-native"
import { shareTrack, trackShareMessage } from "@/utils/shareTrack"

const withVideo = { title: "Lạc Trôi", artist: "Sơn Tùng M-TP", youtubeVideoId: "Llw9Q6akRo4" }
const withoutVideo = { title: "Night Owl", artist: "Kevin MacLeod", youtubeVideoId: null }

afterEach(() => {
  jest.restoreAllMocks()
})

describe("trackShareMessage", () => {
  it("names the track and its artist, then the link of its official video", () => {
    expect(trackShareMessage(withVideo)).toBe(
      "Lạc Trôi - Sơn Tùng M-TP\nhttps://www.youtube.com/watch?v=Llw9Q6akRo4",
    )
  })

  it("is just the name and the artist when the track has no video", () => {
    expect(trackShareMessage(withoutVideo)).toBe("Night Owl - Kevin MacLeod")
  })

  it("keeps an odd video id from breaking the link", () => {
    expect(trackShareMessage({ ...withVideo, youtubeVideoId: "a b&c" })).toContain(
      "watch?v=a%20b%26c",
    )
  })
})

describe("shareTrack", () => {
  it("opens the share sheet with that message and the title", async () => {
    const share = jest
      .spyOn(Share, "share")
      .mockResolvedValue({ action: Share.sharedAction, activityType: undefined })

    await shareTrack(withVideo)

    expect(share).toHaveBeenCalledWith({
      message: trackShareMessage(withVideo),
      title: "Lạc Trôi",
    })
  })

  it("is not an error when the user dismisses the sheet", async () => {
    jest
      .spyOn(Share, "share")
      .mockResolvedValue({ action: Share.dismissedAction, activityType: undefined })

    await expect(shareTrack(withoutVideo)).resolves.toBeUndefined()
  })

  it("passes on a failure to open the sheet", async () => {
    jest.spyOn(Share, "share").mockRejectedValue(new Error("no share target"))

    await expect(shareTrack(withVideo)).rejects.toThrow("no share target")
  })
})
