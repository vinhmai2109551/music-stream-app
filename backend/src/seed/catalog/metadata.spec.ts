import { describe, expect, it } from "@jest/globals"
import { CATALOG_ARTISTS, CATALOG_TRACKS } from "./index.js"
import { CATALOG_METADATA } from "./load-metadata.js"
import { parseCatalogMetadata } from "./metadata.js"

const track = {
  genres: ["v-pop"],
  mood: ["buồn"],
  tags: ["ngày mưa"],
  description: "Một bản ballad nhẹ nhàng.",
  language: "vi",
}

describe("parseCatalogMetadata", () => {
  it("reads a valid file", () => {
    expect(
      parseCatalogMetadata({
        tracks: { t1: track, t2: { ...track, language: null } },
        artists: { a1: { genres: ["pop"] } },
      }),
    ).toEqual({
      tracks: { t1: track, t2: { ...track, language: null } },
      artists: { a1: { genres: ["pop"] } },
    })
  })

  it("accepts an empty file", () => {
    expect(parseCatalogMetadata({ tracks: {}, artists: {} })).toEqual({ tracks: {}, artists: {} })
  })

  it.each([
    ["not an object", "text"],
    ["a list", []],
    ["no tracks", { artists: {} }],
    ["no artists", { tracks: {} }],
    ["tracks as a list", { tracks: [], artists: {} }],
  ])("refuses %s", (_name, raw) => {
    expect(() => parseCatalogMetadata(raw)).toThrow(/metadata\.json must look like/)
  })

  it.each([
    ["a track that is not an object", { t1: "x" }, /tracks\.t1 must be an object/],
    [
      "genres that are not a list",
      { t1: { ...track, genres: "pop" } },
      /tracks\.t1\.genres must be a list/,
    ],
    [
      "11 moods",
      { t1: { ...track, mood: Array(11).fill("x") } },
      /tracks\.t1\.mood has 11 entries/,
    ],
    [
      "a blank tag",
      { t1: { ...track, tags: ["ok", " "] } },
      /tracks\.t1\.tags\[1\] must be a non-empty text/,
    ],
    ["a tag that is not text", { t1: { ...track, tags: [3] } }, /tracks\.t1\.tags\[0\]/],
    ["a long tag", { t1: { ...track, tags: ["x".repeat(41)] } }, /longer than 40/],
    ["no description", { t1: { ...track, description: undefined } }, /description must be a text/],
    ["a long description", { t1: { ...track, description: "x".repeat(601) } }, /longer than 600/],
    ["a bad language", { t1: { ...track, language: "Vietnamese" } }, /language must be null or/],
    ["no language key", { t1: { ...track, language: undefined } }, /language must be null or/],
  ])("names the path of the problem: %s", (_name, tracks, message) => {
    expect(() => parseCatalogMetadata({ tracks, artists: {} })).toThrow(message)
  })

  it("checks artists too", () => {
    expect(() => parseCatalogMetadata({ tracks: {}, artists: { a1: "x" } })).toThrow(
      /artists\.a1 must be an object/,
    )
    expect(() => parseCatalogMetadata({ tracks: {}, artists: { a1: { genres: 1 } } })).toThrow(
      /artists\.a1\.genres must be a list/,
    )
  })
})

describe("the metadata.json that ships with the seed", () => {
  it("only describes tracks and artists that exist in the catalog", () => {
    const trackIds = new Set(CATALOG_TRACKS.map((item) => item.id))
    const artistIds = new Set(CATALOG_ARTISTS.map((item) => item.id))

    expect(Object.keys(CATALOG_METADATA.tracks).filter((id) => !trackIds.has(id))).toEqual([])
    expect(Object.keys(CATALOG_METADATA.artists).filter((id) => !artistIds.has(id))).toEqual([])
  })

  it("holds no text that looks like quoted lyrics", () => {
    const quoted = /["“”«»]([^"“”«»]+)["“”«»]/g
    const lyricLike = Object.entries(CATALOG_METADATA.tracks).filter(([, meta]) =>
      [...meta.description.matchAll(quoted)].some((m) => m[1].trim().split(/\s+/).length > 5),
    )

    expect(lyricLike.map(([id]) => id)).toEqual([])
  })
})
