import { describe, expect, it } from "@jest/globals"
import { setup } from "../testing/tool-setup.js"
import { track } from "../testing/fake-tool-ports.js"

describe("search_catalog", () => {
  it("finds tracks, gives the model compact data and the app the cards to show", async () => {
    const { read, mocks } = setup()

    const { outcome } = await read("search_catalog", { query: "nhạc buồn", limit: 3 })

    expect(outcome.ok).toBe(true)
    expect(mocks.searchTracks).toHaveBeenCalledWith("nhạc buồn", undefined, 3, "u1")
    const result = outcome.result as {
      kind: string
      total: number
      items: Record<string, unknown>[]
    }
    expect(result.kind).toBe("tracks")
    expect(result.items).toHaveLength(3)
    expect(Object.keys(result.items[0]).sort()).toEqual(
      [
        "artist",
        "artistId",
        "description",
        "durationSec",
        "genres",
        "id",
        "language",
        "liked",
        "mood",
        "title",
      ].sort(),
    )
    expect(JSON.stringify(result)).not.toMatch(/https?:|youtube|cover/i)
    expect(outcome.display).toEqual({ tracks: ["t1", "t2", "t3"] })
  })

  it("searches artists, albums and playlists by type", async () => {
    const { read, mocks } = setup()

    expect((await read("search_catalog", { query: "x", type: "artist" })).outcome.display).toEqual({
      artists: ["artist-t1", "artist-t2"],
    })
    expect((await read("search_catalog", { query: "x", type: "album" })).outcome.ok).toBe(true)
    expect(
      (await read("search_catalog", { query: "x", type: "playlist" })).outcome.display,
    ).toEqual({
      playlists: ["official"],
    })
    expect(mocks.searchArtists).toHaveBeenCalled()
  })

  it("passes a region and defaults to 6 results", async () => {
    const { read, mocks } = setup()

    await read("search_catalog", { query: "x", region: "KOREA" })

    expect(mocks.searchTracks).toHaveBeenCalledWith("x", "KOREA", 6, "u1")
  })

  it("tells the model when only the words matched", async () => {
    const { read } = setup({ semantic: false })

    const { outcome } = await read("search_catalog", { query: "x" })

    expect((outcome.result as { note: string }).note).toBe("Matched by words only")
  })

  it.each([
    ["no query", {}],
    ["a blank query", { query: "  " }],
    ["a query over 200 characters", { query: "x".repeat(201) }],
    ["a type that does not exist", { query: "x", type: "lyrics" }],
    ["a region that does not exist", { query: "x", region: "MARS" }],
    ["a limit of 0", { query: "x", limit: 0 }],
    ["a limit of 11", { query: "x", limit: 11 }],
  ])("refuses %s with a message for the model", async (_name, args) => {
    const { read, mocks } = setup()

    const { outcome, unexpected } = await read("search_catalog", args)

    expect(outcome.ok).toBe(false)
    expect((outcome.result as { error: string }).error.length).toBeGreaterThan(5)
    expect(unexpected).toBeUndefined()
    expect(mocks.searchTracks).not.toHaveBeenCalled()
  })

  it("never gives the model more than 10 items", async () => {
    const { read } = setup()
    const { outcome } = await read("search_catalog", { query: "x", limit: 10 })
    expect((outcome.result as { items: unknown[] }).items.length).toBeLessThanOrEqual(10)
  })
})

describe("get_track, get_artist, get_playlist", () => {
  it("give the details, and say when the id is not in the catalog", async () => {
    const { read } = setup()

    const track = await read("get_track", { id: "t2" })
    expect(track.outcome.display).toEqual({ tracks: ["t2"] })
    expect((await read("get_track", { id: "nope" })).outcome).toMatchObject({ ok: false })
    expect((await read("get_artist", { id: "artist-t1" })).outcome.display).toMatchObject({
      artists: ["artist-t1"],
    })
    expect((await read("get_artist", { id: "nope" })).outcome.ok).toBe(false)
    expect((await read("get_album", { id: "nope" })).outcome.ok).toBe(false)
  })

  it("show an editorial playlist or the user's own, and nobody else's", async () => {
    const { read } = setup()

    expect((await read("get_playlist", { id: "official" })).outcome.ok).toBe(true)
    expect((await read("get_playlist", { id: "mine" })).outcome.ok).toBe(true)
    expect((await read("get_playlist", { id: "theirs" })).outcome.ok).toBe(false)
  })

  it("cut long texts so that a big description cannot flood the model", async () => {
    const { read, mocks } = setup()
    mocks.getTrack.mockResolvedValueOnce({
      ...(await mocks.getTrack("t1"))!,
      description: "x".repeat(5000),
    })

    const { outcome } = await read("get_track", { id: "t1" })

    const text = (outcome.result as { track: { description: string } }).track.description
    expect(text.length).toBeLessThanOrEqual(200)
    expect(text.endsWith("…")).toBe(true)
  })
})

describe("get_my_library, recommend_tracks, similar_tracks, search_help", () => {
  it("show the user's playlists with their ids", async () => {
    const { read } = setup()

    const { outcome } = await read("get_my_library")

    const playlists = (outcome.result as { playlists: { items: { id: string }[] } }).playlists
    expect(playlists.items.map((p) => p.id)).toEqual(["mine"])
    expect(outcome.display).toEqual({ playlists: ["mine"] })
  })

  it("recommend tracks and say whether they are personal", async () => {
    const { read } = setup()

    const { outcome } = await read("recommend_tracks", { limit: 2, region: "JAPAN" })

    expect((outcome.result as { personal: boolean; items: unknown[] }).personal).toBe(true)
    expect((outcome.result as { items: unknown[] }).items).toHaveLength(2)
  })

  it("give similar tracks, or an error when the track does not exist", async () => {
    const { read } = setup()

    expect((await read("similar_tracks", { trackId: "t1" })).outcome.display).toEqual({
      tracks: ["t2", "t3", "t4"],
    })
    expect((await read("similar_tracks", { trackId: "nope" })).outcome.ok).toBe(false)
  })

  it("answer a help question with the source to name", async () => {
    const { read } = setup()

    const { outcome } = await read("search_help", { question: "Premium giá bao nhiêu?" })

    expect(outcome.result).toEqual({
      kind: "help",
      items: [
        { source: "premium.md", heading: "Premium › Các gói", content: "Ba gói.", score: 0.81 },
      ],
    })
    expect(outcome.display).toEqual({
      sources: [{ source: "premium.md", heading: "Premium › Các gói" }],
    })
  })

  it("cut a long help text", async () => {
    const { read, mocks } = setup()
    mocks.help.mockResolvedValueOnce([
      { source: "a.md", heading: "A", content: "y".repeat(5000), score: 0.5 },
    ])

    const { outcome } = await read("search_help", { question: "x" })

    expect((outcome.result as { items: { content: string }[] }).items[0].content).toHaveLength(600)
  })
})

describe("play_tracks", () => {
  it("asks the app to play the tracks in order, and needs no approval", async () => {
    const { read } = setup()

    const { outcome } = await read("play_tracks", { trackIds: ["t3", "t1"] })

    expect(outcome.ok).toBe(true)
    expect(outcome.clientAction).toEqual({ action: "play_tracks", trackIds: ["t3", "t1"] })
    expect(outcome.result).toEqual({ kind: "played", count: 2, first: "Bài t3" })
  })

  it("refuses unknown ids, an empty list and more than 50 tracks", async () => {
    const { read } = setup()
    const fifty = Array.from({ length: 51 }, (_, i) => `id${i}`)

    expect((await read("play_tracks", { trackIds: ["t1", "ghost"] })).outcome.ok).toBe(false)
    expect((await read("play_tracks", { trackIds: [] })).outcome.ok).toBe(false)
    expect((await read("play_tracks", { trackIds: fifty })).outcome.ok).toBe(false)
    expect((await read("play_tracks", {})).outcome.ok).toBe(false)
  })

  it("takes exactly 50 tracks", async () => {
    const { read, mocks } = setup()
    const ids = Array.from({ length: 50 }, (_, i) => `id${i}`)
    mocks.tracksByIds.mockImplementationOnce(async (given: string[]) =>
      given.map((id) => track(id)),
    )

    const { outcome } = await read("play_tracks", { trackIds: ids })

    expect(outcome.ok).toBe(true)
    expect(outcome.clientAction?.trackIds).toHaveLength(50)
  })

  it("does not accept a write tool run as an immediate one", async () => {
    const { read } = setup()
    expect((await read("create_playlist", { name: "x" })).outcome.ok).toBe(false)
    expect((await read("no_such_tool")).outcome.ok).toBe(false)
  })
})
