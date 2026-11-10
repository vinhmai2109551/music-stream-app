import { describe, expect, it } from "vitest"
import type { TrackView } from "@/api/types"
import { initialTrackValues, listProblem, toTrackBody, type TrackFormValues } from "./trackValues"

const ID = "dQw4w9WgXcQ"

const values = (patch: Partial<TrackFormValues> = {}): TrackFormValues => ({
  title: "  Bài hát  ",
  artistId: "a1",
  coverUrl: "https://m/c.jpg",
  source: "youtube",
  youtubeInput: `https://youtu.be/${ID}`,
  audioUrl: "",
  durationSec: 215,
  genres: ["pop"],
  mood: [],
  tags: [],
  description: " vui ",
  language: "vi",
  ...patch,
})

describe("toTrackBody", () => {
  it("takes the video id out of a YouTube link and clears the audio url", () => {
    const body = toTrackBody(values({ audioUrl: "https://m/old.mp3" }))

    expect(body).toMatchObject({ youtubeVideoId: ID, audioUrl: null })
  })

  it("keeps the audio url and clears the video id for an audio track", () => {
    const body = toTrackBody(
      values({
        source: "audio",
        audioUrl: "https://m/a.mp3",
        youtubeInput: `https://youtu.be/${ID}`,
      }),
    )

    expect(body).toMatchObject({ audioUrl: "https://m/a.mp3", youtubeVideoId: null })
  })

  it("never has both a video id and an audio url", () => {
    for (const source of ["youtube", "audio"] as const) {
      const body = toTrackBody(values({ source, audioUrl: "https://m/a.mp3" }))
      expect(Boolean(body.audioUrl) && Boolean(body.youtubeVideoId)).toBe(false)
    }
  })

  it("trims the title and the description, and sends the language or null", () => {
    expect(toTrackBody(values())).toMatchObject({
      title: "Bài hát",
      description: "vui",
      language: "vi",
    })
    expect(toTrackBody(values({ language: undefined })).language).toBeNull()
    expect(toTrackBody(values({ language: "" })).language).toBeNull()
  })

  it("sends the lists, empty when there is nothing", () => {
    expect(toTrackBody(values({ genres: undefined as unknown as string[] })).genres).toEqual([])
  })

  it("uses the names the API accepts, and no other", () => {
    const keys = Object.keys(toTrackBody(values())).sort()

    expect(keys).toEqual(
      [
        "title",
        "artistId",
        "coverUrl",
        "durationSec",
        "genres",
        "mood",
        "tags",
        "description",
        "language",
        "youtubeVideoId",
        "audioUrl",
      ].sort(),
    )
  })
})

describe("initialTrackValues", () => {
  const track: TrackView = {
    id: "t1",
    title: "A",
    artist: "Artist",
    artistId: "a1",
    cover: "https://m/c.jpg",
    audioUrl: null,
    plays: 3,
    duration: 200,
    youtubeVideoId: ID,
    genres: ["pop"],
    mood: [],
    tags: [],
    description: "",
    language: null,
    likesCount: 0,
    liked: false,
  }

  it("selects YouTube for a track with a video id", () => {
    expect(initialTrackValues(track)).toMatchObject({
      source: "youtube",
      youtubeInput: ID,
      audioUrl: "",
    })
  })

  it("selects audio for a track with an audio file", () => {
    const audio = { ...track, youtubeVideoId: null, audioUrl: "https://m/a.mp3" }

    expect(initialTrackValues(audio)).toMatchObject({
      source: "audio",
      audioUrl: "https://m/a.mp3",
      youtubeInput: "",
    })
  })

  it("round-trips: an untouched form gives the track back", () => {
    const body = toTrackBody(initialTrackValues(track))

    expect(body).toMatchObject({ title: "A", youtubeVideoId: ID, audioUrl: null, durationSec: 200 })
  })
})

describe("listProblem", () => {
  it("accepts up to 10 entries of up to 40 characters", () => {
    expect(
      listProblem(
        "Thể loại",
        Array.from({ length: 10 }, (_, i) => `g${i}`),
      ),
    ).toBeNull()
    expect(listProblem("Thể loại", ["a".repeat(40)])).toBeNull()
    expect(listProblem("Thể loại", undefined)).toBeNull()
  })

  it("refuses more than 10 entries, a blank entry and one that is too long", () => {
    expect(
      listProblem(
        "Tag",
        Array.from({ length: 11 }, (_, i) => `g${i}`),
      ),
    ).toMatch(/10/)
    expect(listProblem("Tag", ["  "])).toMatch(/trống/)
    expect(listProblem("Tag", ["a".repeat(41)])).toMatch(/40/)
  })
})
