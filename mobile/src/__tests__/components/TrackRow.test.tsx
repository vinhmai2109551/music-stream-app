import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import { render, screen, userEvent } from "@testing-library/react-native"
import { TrackRow } from "@/components/media/TrackRow"
import { useLibraryStore } from "@/store/libraryStore"
import { usePlayerStore } from "@/store/playerStore"
import { r2Track } from "../helpers/playback"

jest.mock("@/api/likes", () => ({ setLiked: jest.fn(async () => undefined) }))
jest.mock("@/api/tracks", () => ({ listLikedTracks: jest.fn() }))
jest.mock("@/api/albums", () => ({ listLikedAlbums: jest.fn() }))
jest.mock("@/api/artists", () => ({ listFollowedArtists: jest.fn() }))
jest.mock("@/api/follows", () => ({ setFollowing: jest.fn() }))
jest.mock("@/api/playlists", () => ({
  listLikedPlaylists: jest.fn(),
  listMyPlaylists: jest.fn(),
  addTrackToPlaylist: jest.fn(),
  createPlaylist: jest.fn(),
}))

/* eslint-disable @typescript-eslint/no-require-imports */
const likesApi = jest.mocked(require("@/api/likes") as typeof import("@/api/likes"))
/* eslint-enable @typescript-eslint/no-require-imports */

const tracks = [r2Track("a"), r2Track("b")]

beforeEach(() => {
  jest.clearAllMocks()
  usePlayerStore.getState().reset()
  useLibraryStore.getState().reset()
})

describe("TrackRow", () => {
  it("shows the title, the artist, the plays and the length", async () => {
    await render(<TrackRow track={tracks[0]} index={0} list={tracks} />)

    expect(screen.getByText("Title a")).toBeOnTheScreen()
    expect(screen.getByText(/Artist · 1 · 3:20/)).toBeOnTheScreen()
  })

  it("pressing the row plays the track from its list", async () => {
    const user = userEvent.setup()
    await render(<TrackRow track={tracks[1]} index={1} list={tracks} source="My list" />)

    await user.press(screen.getByRole("button", { name: "Play Title b by Artist" }))

    const player = usePlayerStore.getState()
    expect(player.currentTrack?.id).toBe("b")
    expect(player.isPlaying).toBe(true)
    expect(player.queue.map((track) => track.id)).toEqual(["a", "b"])
    expect(player.queueSource).toBe("My list")
  })

  it("marks the row of the track that is playing", async () => {
    usePlayerStore.getState().playFromList(tracks, 0)
    await render(<TrackRow track={tracks[0]} index={0} list={tracks} />)

    expect(
      screen.getByRole("button", { name: "Play Title a by Artist", selected: true }),
    ).toBeOnTheScreen()
  })

  describe("with a heart at the end (trailing=like)", () => {
    it("pressing it likes the track at once and tells the server", async () => {
      const user = userEvent.setup()
      await render(<TrackRow track={tracks[0]} index={0} list={tracks} trailing="like" />)

      await user.press(screen.getByRole("button", { name: "Like" }))

      expect(useLibraryStore.getState().likedTrackIds).toEqual(["a"])
      expect(likesApi.setLiked).toHaveBeenCalledWith("tracks", "a", true)
      expect(screen.getByRole("button", { name: "Unlike" })).toBeOnTheScreen()
    })

    it("an already liked track offers Unlike, and pressing it removes the like", async () => {
      useLibraryStore.setState({ likedTrackIds: ["a"] })
      const user = userEvent.setup()
      await render(<TrackRow track={tracks[0]} index={0} list={tracks} trailing="like" />)

      await user.press(screen.getByRole("button", { name: "Unlike" }))

      expect(useLibraryStore.getState().likedTrackIds).toEqual([])
      expect(likesApi.setLiked).toHaveBeenCalledWith("tracks", "a", false)
    })
  })

  describe("with the menu at the end (default)", () => {
    it("has no menu open at first and opens it from the More options button", async () => {
      const user = userEvent.setup()
      await render(<TrackRow track={tracks[0]} index={0} list={tracks} />)
      expect(screen.queryByText("Add to liked songs")).not.toBeOnTheScreen()

      await user.press(screen.getByRole("button", { name: "More options" }))

      expect(await screen.findByText("Add to liked songs")).toBeOnTheScreen()
    })

    it("likes the track from the menu once the library has loaded", async () => {
      useLibraryStore.setState({ status: "ready" })
      const user = userEvent.setup()
      await render(<TrackRow track={tracks[0]} index={0} list={tracks} />)
      await user.press(screen.getByRole("button", { name: "More options" }))

      await user.press(await screen.findByText("Add to liked songs"))

      expect(useLibraryStore.getState().likedTrackIds).toEqual(["a"])
      expect(likesApi.setLiked).toHaveBeenCalledWith("tracks", "a", true)
    })

    it("the like button of the menu waits until the library is ready", async () => {
      useLibraryStore.setState({ status: "loading" })
      const user = userEvent.setup()
      await render(<TrackRow track={tracks[0]} index={0} list={tracks} />)
      await user.press(screen.getByRole("button", { name: "More options" }))

      await user.press(await screen.findByText("Add to liked songs"))

      expect(useLibraryStore.getState().likedTrackIds).toEqual([])
      expect(likesApi.setLiked).not.toHaveBeenCalled()
    })
  })
})
