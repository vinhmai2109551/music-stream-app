import { describe, expect, it } from "@jest/globals"
import { ME, setup } from "../testing/tool-setup.js"
import { ToolInputError } from "./tool.js"

describe("the tools that change the data of the user: proposing", () => {
  it("create_playlist proposes with a sentence that says what will happen, and changes nothing", async () => {
    const { write, mocks } = setup()

    const proposal = await write("create_playlist").propose(ME, {
      name: " Chạy bộ K-Pop ",
      trackIds: ["t1", "t2", "t3", "t4"],
    })

    expect(proposal.summary).toBe(
      "Tạo playlist “Chạy bộ K-Pop” gồm 4 bài: “Bài t1”, “Bài t2”, “Bài t3” và 1 bài nữa",
    )
    expect(proposal.input).toEqual({ name: "Chạy bộ K-Pop", trackIds: ["t1", "t2", "t3", "t4"] })
    expect(mocks.createPlaylist).not.toHaveBeenCalled()
  })

  it("create_playlist may be empty, and needs a name of 100 characters at most", async () => {
    const { write } = setup()

    expect((await write("create_playlist").propose(ME, { name: "Trống" })).summary).toBe(
      "Tạo playlist “Trống” (để trống)",
    )
    await expect(write("create_playlist").propose(ME, { name: "x".repeat(101) })).rejects.toThrow(
      ToolInputError,
    )
    await expect(write("create_playlist").propose(ME, {})).rejects.toThrow(/"name" is required/)
  })

  it("create_playlist refuses tracks that are not in the catalog, and more than 50", async () => {
    const { write } = setup()

    await expect(
      write("create_playlist").propose(ME, { name: "x", trackIds: ["t1", "ghost"] }),
    ).rejects.toThrow(/1 track id\(s\) are not in the catalog: ghost/)
    await expect(
      write("create_playlist").propose(ME, {
        name: "x",
        trackIds: Array.from({ length: 51 }, (_, i) => `id${i}`),
      }),
    ).rejects.toThrow(/at most 50/)
  })

  it("add_tracks_to_playlist only works on the user's own playlists", async () => {
    const { write } = setup()
    const tool = write("add_tracks_to_playlist")

    const own = await tool.propose(ME, { playlistId: "mine", trackIds: ["t2", "t3"] })
    expect(own.summary).toBe("Thêm 2 bài vào playlist “Playlist mine”: “Bài t2”, “Bài t3”")

    await expect(tool.propose(ME, { playlistId: "theirs", trackIds: ["t2"] })).rejects.toThrow(
      /not one of the user's own/,
    )
    await expect(tool.propose(ME, { playlistId: "official", trackIds: ["t2"] })).rejects.toThrow(
      /not one of the user's own/,
    )
    await expect(tool.propose(ME, { playlistId: "ghost", trackIds: ["t2"] })).rejects.toThrow(
      ToolInputError,
    )
  })

  it("like_tracks and follow_artist propose, and refuse what is not in the catalog", async () => {
    const { write } = setup()

    expect((await write("like_tracks").propose(ME, { trackIds: ["t1"] })).summary).toBe(
      "Thích 1 bài hát: “Bài t1”",
    )
    await expect(write("like_tracks").propose(ME, { trackIds: ["ghost"] })).rejects.toThrow(
      ToolInputError,
    )
    expect((await write("follow_artist").propose(ME, { artistId: "artist-t1" })).summary).toBe(
      "Theo dõi nghệ sĩ “Nghệ sĩ artist-t1”",
    )
    await expect(write("follow_artist").propose(ME, { artistId: "ghost" })).rejects.toThrow(
      /No artist/,
    )
  })

  it("never change anything when only proposing", async () => {
    const { write, mocks, state } = setup()

    await write("create_playlist").propose(ME, { name: "x", trackIds: ["t1"] })
    await write("add_tracks_to_playlist").propose(ME, { playlistId: "mine", trackIds: ["t2"] })
    await write("like_tracks").propose(ME, { trackIds: ["t1"] })
    await write("follow_artist").propose(ME, { artistId: "artist-t1" })

    expect(mocks.createPlaylist).not.toHaveBeenCalled()
    expect(mocks.addTracks).not.toHaveBeenCalled()
    expect(mocks.likeTracks).not.toHaveBeenCalled()
    expect(mocks.followArtist).not.toHaveBeenCalled()
    expect(state.liked.size + state.followed.size + state.created.length).toBe(0)
  })
})

describe("the tools that change the data of the user: after the person agrees", () => {
  it("create_playlist makes the playlist for the user with the tracks", async () => {
    const { write, mocks } = setup()
    const { input } = await write("create_playlist").propose(ME, {
      name: "Mới",
      description: "Mô tả",
      trackIds: ["t1", "t2"],
    })

    const done = await write("create_playlist").execute(ME, input)

    expect(mocks.createPlaylist).toHaveBeenCalledWith("u1", "Mới", "Mô tả", ["t1", "t2"])
    expect(done.result).toEqual({
      kind: "playlist_created",
      id: "new-1",
      name: "Mới",
      tracksAdded: 2,
    })
    expect(done.display).toEqual({ playlists: ["new-1"] })
  })

  it("take the user from the context only", async () => {
    const { write, mocks } = setup()

    await write("like_tracks").execute({ userId: "someone" }, { trackIds: ["t1"], userId: "u9" })

    expect(mocks.likeTracks).toHaveBeenCalledWith("someone", ["t1"])
  })

  it("check the arguments again, as they come from a stored action", async () => {
    const { write } = setup()

    await expect(write("create_playlist").execute(ME, { name: "", trackIds: [] })).rejects.toThrow(
      ToolInputError,
    )
    await expect(
      write("like_tracks").execute(ME, { trackIds: Array.from({ length: 51 }, (_, i) => `t${i}`) }),
    ).rejects.toThrow(/at most 50/)
  })

  it("add_tracks_to_playlist and follow_artist go through the ports of the user's own data", async () => {
    const { write, mocks, state } = setup()

    const added = await write("add_tracks_to_playlist").execute(ME, {
      playlistId: "mine",
      trackIds: ["t2"],
    })
    const followed = await write("follow_artist").execute(ME, { artistId: "artist-t2" })

    expect(added.result).toEqual({
      kind: "tracks_added",
      playlist: "Playlist mine",
      tracksAdded: 1,
    })
    expect(followed.result).toEqual({ kind: "followed", artistId: "artist-t2" })
    expect(mocks.addTracks).toHaveBeenCalledWith("u1", "mine", ["t2"])
    expect(state.followed.has("artist-t2")).toBe(true)
  })

  it("add_tracks_to_playlist is refused for another user's playlist even when it is executed directly", async () => {
    const { write } = setup()

    await expect(
      write("add_tracks_to_playlist").execute(ME, { playlistId: "theirs", trackIds: ["t1"] }),
    ).rejects.toThrow(/not one of the user's own/)
  })
})
