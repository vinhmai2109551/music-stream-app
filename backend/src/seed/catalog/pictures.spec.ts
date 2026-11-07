import { describe, expect, it } from "@jest/globals"
import { CATALOG_ALBUMS, CATALOG_ARTISTS, CATALOG_TRACKS, type MediaRef } from "./index.js"
import { pictureVideoOf, videoPicture } from "./pictures.js"
import { YOUTUBE_VIDEO_IDS } from "./youtube-ids.js"

/** A video measured as having no 1280 x 720 picture, and one with black bars in its picture. */
const SMALL_ONLY = "sHD_z90ZKV0"
const LETTERBOXED = "8x2NjwwHUbQ"

const track = (plays: number, youtubeVideoId?: string) => ({ plays, youtubeVideoId })

describe("videoPicture", () => {
  it("points at the 1280 x 720 picture of the video", () => {
    expect(videoPicture("dQw4w9WgXcQ")).toBe("https://i.ytimg.com/vi/dQw4w9WgXcQ/hq720.jpg")
  })

  it("uses the small picture for a video that has no large one", () => {
    expect(videoPicture(SMALL_ONLY)).toBe(`https://i.ytimg.com/vi/${SMALL_ONLY}/mqdefault.jpg`)
  })
})

describe("pictureVideoOf", () => {
  it("takes the video of the most played track", () => {
    expect(pictureVideoOf([track(10, "aaa"), track(50, "bbb"), track(30, "ccc")])).toBe("bbb")
  })

  it("skip takes the next most played, and stops at the last one", () => {
    const tracks = [track(10, "aaa"), track(50, "bbb"), track(30, "ccc")]

    expect(pictureVideoOf(tracks, 1)).toBe("ccc")
    expect(pictureVideoOf(tracks, 2)).toBe("aaa")
    expect(pictureVideoOf(tracks, 9)).toBe("aaa")
  })

  it("ignores tracks without a video", () => {
    expect(
      pictureVideoOf([track(99), track(5, "aaa"), track(80, null as unknown as undefined)]),
    ).toBe("aaa")
  })

  it("avoids a picture with black bars while another one is left", () => {
    expect(pictureVideoOf([track(90, LETTERBOXED), track(10, "aaa")])).toBe("aaa")
    expect(pictureVideoOf([track(90, LETTERBOXED), track(10, "aaa")], 1)).toBe("aaa")
  })

  it("uses a picture with black bars when it is the only one", () => {
    expect(pictureVideoOf([track(90, LETTERBOXED)])).toBe(LETTERBOXED)
  })

  it("has nothing for tracks without any video", () => {
    expect(pictureVideoOf([track(1), track(2)])).toBeUndefined()
    expect(pictureVideoOf([])).toBeUndefined()
  })
})

describe("the catalog", () => {
  const videos = new Set(Object.values(YOUTUBE_VIDEO_IDS))
  const isPicture = (ref: MediaRef) =>
    "url" in ref && /^https:\/\/i\.ytimg\.com\/vi\/[\w-]{11}\/\w+\.jpg$/.test(ref.url)

  it("gives every song with a video the picture of that video as its cover", () => {
    const withVideo = CATALOG_TRACKS.filter((song) => song.youtubeVideoId)

    expect(withVideo.length).toBeGreaterThan(100)
    for (const song of withVideo) {
      expect(song.cover).toEqual({ url: videoPicture(song.youtubeVideoId as string) })
      expect(videos.has(song.youtubeVideoId as string)).toBe(true)
    }
  })

  it("gives every artist that has a song with a video a picture of one of their videos", () => {
    for (const artist of CATALOG_ARTISTS) {
      const own = CATALOG_TRACKS.filter(
        (song) => song.artistId === artist.id && song.youtubeVideoId,
      )
      if (own.length === 0) continue
      expect(isPicture(artist.image)).toBe(true)
      expect(own.map((song) => videoPicture(song.youtubeVideoId as string))).toContain(
        (artist.image as { url: string }).url,
      )
    }
  })

  it("keeps the files in the bucket for an artist without a video (Kevin MacLeod)", () => {
    const artist = CATALOG_ARTISTS.find((candidate) => candidate.id === "kevin-macleod")

    expect(artist?.image).toEqual({ folder: "artists", file: "kevin-macleod.jpg" })
  })

  it("gives every album a picture of its artist's videos, not the artist's own picture when another exists", () => {
    expect(CATALOG_ALBUMS.length).toBeGreaterThan(0)
    for (const album of CATALOG_ALBUMS) {
      const artist = CATALOG_ARTISTS.find((candidate) => candidate.id === album.artistId)
      expect(isPicture(album.cover)).toBe(true)
      expect((album.cover as { url: string }).url).not.toBe((artist?.image as { url: string }).url)
    }
  })
})
