import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import { ApiError } from "@/api/client"
import type { ApiPlaylist } from "@/api/types"
import { copy } from "@/constants/copy"
import { useLibraryStore } from "@/store/libraryStore"
import { useToastStore } from "@/store/toastStore"

jest.mock("@/api/tracks", () => ({ listLikedTracks: jest.fn() }))
jest.mock("@/api/albums", () => ({ listLikedAlbums: jest.fn() }))
jest.mock("@/api/artists", () => ({ listFollowedArtists: jest.fn() }))
jest.mock("@/api/likes", () => ({ setLiked: jest.fn() }))
jest.mock("@/api/follows", () => ({ setFollowing: jest.fn() }))
jest.mock("@/api/playlists", () => ({
  listLikedPlaylists: jest.fn(),
  listMyPlaylists: jest.fn(),
  addTrackToPlaylist: jest.fn(),
  createPlaylist: jest.fn(),
}))

/* eslint-disable @typescript-eslint/no-require-imports */
const tracksApi = jest.mocked(require("@/api/tracks") as typeof import("@/api/tracks"))
const albumsApi = jest.mocked(require("@/api/albums") as typeof import("@/api/albums"))
const artistsApi = jest.mocked(require("@/api/artists") as typeof import("@/api/artists"))
const likesApi = jest.mocked(require("@/api/likes") as typeof import("@/api/likes"))
const followsApi = jest.mocked(require("@/api/follows") as typeof import("@/api/follows"))
const playlistsApi = jest.mocked(require("@/api/playlists") as typeof import("@/api/playlists"))
/* eslint-enable @typescript-eslint/no-require-imports */

const state = () => useLibraryStore.getState()
const toast = () => useToastStore.getState().message
const refused = new ApiError({ status: 403, kind: "http", message: "Not allowed" })

const playlist = (id: string, trackIds: string[] = []): ApiPlaylist =>
  ({ id, name: `List ${id}`, trackIds }) as unknown as ApiPlaylist

/** A promise the test settles by hand, to look at the state while a request is in flight. */
function deferred<T = void>() {
  let resolve: (value: T) => void = () => {}
  let reject: (error: unknown) => void = () => {}
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

beforeEach(() => {
  jest.clearAllMocks()
  state().reset()
  useToastStore.setState({ message: null })
})

describe("load", () => {
  it("fills the library from the server", async () => {
    tracksApi.listLikedTracks.mockResolvedValue([{ id: "t1" }, { id: "t2" }] as never)
    albumsApi.listLikedAlbums.mockResolvedValue([{ id: "al1" }] as never)
    playlistsApi.listLikedPlaylists.mockResolvedValue([{ id: "pl1" }] as never)
    artistsApi.listFollowedArtists.mockResolvedValue([{ id: "ar1" }] as never)
    playlistsApi.listMyPlaylists.mockResolvedValue([playlist("mine")])

    const loading = state().load()
    expect(state().status).toBe("loading")
    await loading

    expect(state()).toMatchObject({
      status: "ready",
      likedTrackIds: ["t1", "t2"],
      likedAlbumIds: ["al1"],
      likedPlaylistIds: ["pl1"],
      followedArtistIds: ["ar1"],
    })
    expect(state().playlists.map((item) => item.id)).toEqual(["mine"])
  })

  it("reports an error and says why", async () => {
    tracksApi.listLikedTracks.mockRejectedValue(refused)
    albumsApi.listLikedAlbums.mockResolvedValue([])
    playlistsApi.listLikedPlaylists.mockResolvedValue([])
    artistsApi.listFollowedArtists.mockResolvedValue([])
    playlistsApi.listMyPlaylists.mockResolvedValue([])

    await state().load()

    expect(state().status).toBe("error")
    expect(toast()).toBe("Not allowed")
  })

  it("reset() forgets everything", async () => {
    useLibraryStore.setState({ likedTrackIds: ["t1"], status: "ready", playlistRevision: 4 })

    state().reset()

    expect(state()).toMatchObject({ status: "idle", likedTrackIds: [], playlistRevision: 0 })
  })
})

describe("likes and follows (optimistic)", () => {
  it("a like shows at once, newest first, and is sent to the server", async () => {
    useLibraryStore.setState({ likedTrackIds: ["old"] })
    const request = deferred()
    likesApi.setLiked.mockReturnValue(request.promise as never)

    const done = state().toggleLike("t1")

    expect(state().likedTrackIds).toEqual(["t1", "old"]) // before the server answered
    request.resolve()
    await done
    expect(likesApi.setLiked).toHaveBeenCalledWith("tracks", "t1", true)
    expect(state().likedTrackIds).toEqual(["t1", "old"])
  })

  it("an unlike removes it and tells the server", async () => {
    useLibraryStore.setState({ likedTrackIds: ["t1", "t2"] })
    likesApi.setLiked.mockResolvedValue(undefined as never)

    await state().toggleLike("t1")

    expect(state().likedTrackIds).toEqual(["t2"])
    expect(likesApi.setLiked).toHaveBeenCalledWith("tracks", "t1", false)
  })

  it("is undone, with a message, when the server refuses", async () => {
    likesApi.setLiked.mockRejectedValue(refused)

    await state().toggleLike("t1")

    expect(state().likedTrackIds).toEqual([])
    expect(toast()).toBe("Not allowed")
  })

  it("an unlike that fails brings the like back", async () => {
    useLibraryStore.setState({ likedTrackIds: ["t1"] })
    likesApi.setLiked.mockRejectedValue(refused)

    await state().toggleLike("t1")

    expect(state().likedTrackIds).toEqual(["t1"])
  })

  it("a double tap while the request is in flight sends only one", async () => {
    const request = deferred()
    likesApi.setLiked.mockReturnValue(request.promise as never)

    const first = state().toggleLike("t1")
    const second = state().toggleLike("t1")
    request.resolve()
    await Promise.all([first, second])

    expect(likesApi.setLiked).toHaveBeenCalledTimes(1)
    expect(state().likedTrackIds).toEqual(["t1"])
  })

  it("albums and playlists use their own kind and list", async () => {
    likesApi.setLiked.mockResolvedValue(undefined as never)

    await state().toggleAlbumLike("al1")
    await state().togglePlaylistLike("pl1")

    expect(likesApi.setLiked).toHaveBeenCalledWith("albums", "al1", true)
    expect(likesApi.setLiked).toHaveBeenCalledWith("playlists", "pl1", true)
    expect(state().likedAlbumIds).toEqual(["al1"])
    expect(state().likedPlaylistIds).toEqual(["pl1"])
  })

  it("following an artist goes through the follows API", async () => {
    followsApi.setFollowing.mockResolvedValue(undefined as never)

    await state().toggleFollow("ar1")
    expect(followsApi.setFollowing).toHaveBeenCalledWith("ar1", true)
    expect(state().followedArtistIds).toEqual(["ar1"])

    await state().toggleFollow("ar1")
    expect(followsApi.setFollowing).toHaveBeenLastCalledWith("ar1", false)
    expect(state().followedArtistIds).toEqual([])
  })
})

describe("addTrackToPlaylist", () => {
  beforeEach(() => useLibraryStore.setState({ playlists: [playlist("p1", ["a"])] }))

  it("does nothing for a playlist the user does not have", async () => {
    await state().addTrackToPlaylist("nope", "b")

    expect(playlistsApi.addTrackToPlaylist).not.toHaveBeenCalled()
    expect(toast()).toBeNull()
  })

  it("says so when the track is already in it, and sends nothing", async () => {
    await state().addTrackToPlaylist("p1", "a")

    expect(toast()).toBe(`${copy.library.alreadyIn} List p1`)
    expect(playlistsApi.addTrackToPlaylist).not.toHaveBeenCalled()
  })

  it("adds the track at the end at once, confirms, and tells the server", async () => {
    const request = deferred()
    playlistsApi.addTrackToPlaylist.mockReturnValue(request.promise as never)
    const revision = state().playlistRevision

    const done = state().addTrackToPlaylist("p1", "b")

    expect(state().playlists[0].trackIds).toEqual(["a", "b"])
    expect(state().playlistRevision).toBe(revision + 1)
    expect(toast()).toBe(`${copy.library.addedTo} List p1`)
    request.resolve()
    await done
    expect(playlistsApi.addTrackToPlaylist).toHaveBeenCalledWith("p1", "b")
  })

  it("takes the track out again and shows the reason when the server refuses", async () => {
    playlistsApi.addTrackToPlaylist.mockRejectedValue(refused)

    await state().addTrackToPlaylist("p1", "b")

    expect(state().playlists[0].trackIds).toEqual(["a"])
    expect(toast()).toBe("Not allowed")
  })
})

describe("createPlaylist", () => {
  it("adds the new playlist (without its track details) and returns it", async () => {
    playlistsApi.createPlaylist.mockResolvedValue({
      id: "new",
      name: "Road trip",
      trackIds: [],
      tracks: [],
    } as never)

    const created = await state().createPlaylist("  Road trip ")

    expect(playlistsApi.createPlaylist).toHaveBeenCalledWith({ name: "Road trip" })
    expect(created?.id).toBe("new")
    expect(state().playlists.map((item) => item.id)).toEqual(["new"])
    expect("tracks" in state().playlists[0]).toBe(false)
  })

  it("returns null and shows the reason when it fails", async () => {
    playlistsApi.createPlaylist.mockRejectedValue(refused)

    expect(await state().createPlaylist("x")).toBeNull()
    expect(state().playlists).toEqual([])
    expect(toast()).toBe("Not allowed")
  })
})
