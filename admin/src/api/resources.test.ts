import { describe, expect, it } from "vitest"
import { filtersToQuery } from "@/providers/dataProvider"
import { adapterFor, RESOURCES } from "./resources"

const tracks = RESOURCES.tracks
const track = (values: Record<string, unknown>) => tracks.toApi!(values)

describe("track body", () => {
  it("keeps only fields the API knows (it refuses anything else)", () => {
    const body = track({
      title: "A",
      artistId: "x",
      coverUrl: "https://m/c.jpg",
      durationSec: 200,
      id: "t1",
      cover: "https://m/c.jpg",
      duration: 200,
      plays: 5,
      likesCount: 2,
      liked: false,
      artist: "Name",
    })

    expect(Object.keys(body).sort()).toEqual(["artistId", "coverUrl", "durationSec", "title"])
  })

  it("turns an empty audio url, video id or language into null", () => {
    const body = track({ audioUrl: "", youtubeVideoId: "AAAAAAAAAAA", language: "" })

    expect(body).toEqual({ audioUrl: null, youtubeVideoId: "AAAAAAAAAAA", language: null })
  })

  it("does not invent fields that were not given (a PATCH changes only what is sent)", () => {
    expect(track({ title: "B" })).toEqual({ title: "B" })
  })

  it("reads the display names of the API under the names of the form", () => {
    const row = tracks.fromApi!({ id: "t1", cover: "https://m/c.jpg", duration: 215 })

    expect(row).toMatchObject({
      coverUrl: "https://m/c.jpg",
      durationSec: 215,
      cover: "https://m/c.jpg",
    })
  })
})

describe("artist, album, feed and user bodies", () => {
  it("maps the picture of an artist and drops an empty follower count", () => {
    expect(RESOURCES.artists.fromApi!({ image: "https://m/a.jpg" })).toMatchObject({
      imageUrl: "https://m/a.jpg",
    })
    expect(
      RESOURCES.artists.toApi!({ name: "N", imageUrl: "u", baseFollowers: null, followers: 9 }),
    ).toEqual({
      name: "N",
      imageUrl: "u",
    })
    expect(RESOURCES.artists.toApi!({ baseFollowers: 0 })).toEqual({ baseFollowers: 0 })
  })

  it("sends the tracks of an album as an ordered list of ids", () => {
    expect(
      RESOURCES.albums.toApi!({
        title: "T",
        artistId: "a",
        coverUrl: "u",
        trackIds: ["2", "1"],
        tracks: [],
      }),
    ).toEqual({ title: "T", artistId: "a", coverUrl: "u", trackIds: ["2", "1"] })
  })

  it("sends only the fields of a feed post that the API takes", () => {
    expect(
      RESOURCES.feed.toApi!({
        artistId: "a",
        trackId: "t",
        artworkUrl: "u",
        caption: "hi",
        likesCount: 3,
      }),
    ).toEqual({ artistId: "a", trackId: "t", artworkUrl: "u", caption: "hi" })
  })

  it("sends only role and isBanned for a user", () => {
    expect(RESOURCES.users.toApi!({ role: "ADMIN", email: "x", passwordHash: "y" })).toEqual({
      role: "ADMIN",
    })
    expect(RESOURCES.users.path).toBe("/admin/users")
  })

  it("knows which resources can be read one by one", () => {
    expect(adapterFor("tracks").hasDetail).toBe(true)
    expect(adapterFor("feed").hasDetail).toBe(false)
    expect(adapterFor("users").hasDetail).toBe(false)
  })

  it("rejects an unknown resource", () => {
    expect(() => adapterFor("nope")).toThrow(/nope/)
  })
})

describe("filtersToQuery", () => {
  it("turns Refine filters into query parameters the resource has", () => {
    const query = filtersToQuery(tracks, [
      { field: "q", operator: "contains", value: "sơn" },
      { field: "artistId", operator: "eq", value: "a1" },
      { field: "region", operator: "eq", value: "VIETNAM" },
    ])

    expect(query).toEqual({ q: "sơn", artistId: "a1", region: "VIETNAM" })
  })

  it("skips empty values and filters the resource does not have", () => {
    const query = filtersToQuery(RESOURCES.artists, [
      { field: "q", operator: "contains", value: "" },
      { field: "artistId", operator: "eq", value: "a1" },
      { field: "region", operator: "eq", value: undefined },
      { field: "region", operator: "eq", value: null },
    ])

    expect(query).toEqual({})
  })

  it("keeps a boolean filter, false included", () => {
    expect(
      filtersToQuery(RESOURCES.users, [{ field: "banned", operator: "eq", value: false }]),
    ).toEqual({
      banned: false,
    })
  })

  it("is empty without filters", () => {
    expect(filtersToQuery(tracks, undefined)).toEqual({})
  })
})
