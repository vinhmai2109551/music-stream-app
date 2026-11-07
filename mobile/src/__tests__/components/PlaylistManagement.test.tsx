import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import { render, screen, userEvent, waitFor } from "@testing-library/react-native"
import { router } from "expo-router"
import { ApiError } from "@/api/client"
import type { ApiPlaylist, ApiPlaylistDetail } from "@/api/types"
import { CollectionView } from "@/components/media/CollectionView"
import { PlaylistOwnerControls } from "@/components/media/PlaylistOwnerControls"
import { TrackMenuSheet } from "@/components/media/TrackMenuSheet"
import { copy } from "@/constants/copy"
import { useLibraryStore } from "@/store/libraryStore"
import { usePlayerStore } from "@/store/playerStore"
import { useToastStore } from "@/store/toastStore"
import { r2Track } from "../helpers/playback"

jest.mock("expo-router", () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(), replace: jest.fn(), push: jest.fn() },
}))
jest.mock("@/api/likes", () => ({ setLiked: jest.fn() }))
jest.mock("@/api/tracks", () => ({ listLikedTracks: jest.fn() }))
jest.mock("@/api/albums", () => ({ listLikedAlbums: jest.fn(), getAlbum: jest.fn() }))
jest.mock("@/api/artists", () => ({ listFollowedArtists: jest.fn() }))
jest.mock("@/api/follows", () => ({ setFollowing: jest.fn() }))
jest.mock("@/api/playlists", () => ({
  listLikedPlaylists: jest.fn(),
  listMyPlaylists: jest.fn(),
  getPlaylist: jest.fn(),
  addTrackToPlaylist: jest.fn(),
  createPlaylist: jest.fn(),
  updatePlaylist: jest.fn(),
  deletePlaylist: jest.fn(),
  removeTrackFromPlaylist: jest.fn(),
}))

/* eslint-disable @typescript-eslint/no-require-imports */
const playlistsApi = jest.mocked(require("@/api/playlists") as typeof import("@/api/playlists"))
/* eslint-enable @typescript-eslint/no-require-imports */
const text = copy.library
const mockRouter = jest.mocked(router)

const refused = new ApiError({ status: 403, kind: "http", message: "Not allowed" })
const toast = () => useToastStore.getState().message
const library = () => useLibraryStore.getState()

const playlist = (over: Partial<ApiPlaylist> = {}): ApiPlaylist => ({
  id: "p1",
  name: "Road trip",
  owner: "Me",
  ownerId: "u1",
  isOfficial: false,
  description: "",
  cover: null,
  trackIds: ["a", "b"],
  likesCount: 0,
  liked: false,
  ...over,
})
const tracks = [r2Track("a"), r2Track("b")]
const detail = (over: Partial<ApiPlaylist> = {}): ApiPlaylistDetail =>
  ({ ...playlist(over), tracks }) as ApiPlaylistDetail

beforeEach(() => {
  jest.clearAllMocks()
  usePlayerStore.getState().reset()
  library().reset()
  useLibraryStore.setState({ status: "ready", playlists: [playlist()] })
  useToastStore.setState({ message: null })
  mockRouter.canGoBack.mockReturnValue(true)
})

describe("PlaylistOwnerControls: rename", () => {
  const open = async () => {
    const user = userEvent.setup()
    await render(<PlaylistOwnerControls playlistId="p1" name="Road trip" />)
    await user.press(screen.getByRole("button", { name: text.rename }))
    return user
  }
  const nameInput = () => screen.getByLabelText(text.playlistNamePlaceholder)

  it("opens a sheet with the current name", async () => {
    await open()

    expect(nameInput().props.value).toBe("Road trip")
  })

  it("saves the new name, confirms it, and closes", async () => {
    playlistsApi.updatePlaylist.mockResolvedValue(detail({ name: "Night drive" }))
    const user = await open()

    await user.clear(nameInput())
    await user.type(nameInput(), "  Night drive ")
    await user.press(screen.getByRole("button", { name: text.save }))

    await waitFor(() => expect(toast()).toBe(text.renamed))
    expect(playlistsApi.updatePlaylist).toHaveBeenCalledWith("p1", { name: "Night drive" })
    expect(library().playlists[0].name).toBe("Night drive")
    expect(screen.queryByLabelText(text.playlistNamePlaceholder)).not.toBeOnTheScreen()
  })

  it("stays open, keeps the old name and says why when the server refuses", async () => {
    playlistsApi.updatePlaylist.mockRejectedValue(refused)
    const user = await open()

    await user.clear(nameInput())
    await user.type(nameInput(), "Night drive")
    await user.press(screen.getByRole("button", { name: text.save }))

    await waitFor(() => expect(toast()).toBe("Not allowed"))
    expect(library().playlists[0].name).toBe("Road trip")
    expect(nameInput()).toBeOnTheScreen()
  })

  it("closes without a request when the name was not changed", async () => {
    const user = await open()

    await user.press(screen.getByRole("button", { name: text.save }))

    expect(playlistsApi.updatePlaylist).not.toHaveBeenCalled()
    await waitFor(() =>
      expect(screen.queryByLabelText(text.playlistNamePlaceholder)).not.toBeOnTheScreen(),
    )
    expect(toast()).toBeNull()
  })

  it("cannot save an empty name", async () => {
    const user = await open()

    await user.clear(nameInput())

    expect(screen.getByRole("button", { name: text.save })).toBeDisabled()
  })
})

describe("PlaylistOwnerControls: delete", () => {
  const open = async () => {
    const user = userEvent.setup()
    await render(<PlaylistOwnerControls playlistId="p1" name="Road trip" />)
    await user.press(screen.getByRole("button", { name: text.delete }))
    return user
  }

  it("asks first, naming the playlist, and deletes nothing yet", async () => {
    await open()

    expect(screen.getByText(`${text.deleteConfirmTitle} “Road trip”`)).toBeOnTheScreen()
    expect(screen.getByText(text.deleteConfirmMessage)).toBeOnTheScreen()
    expect(playlistsApi.deletePlaylist).not.toHaveBeenCalled()
    expect(library().playlists).toHaveLength(1)
  })

  it("cancel leaves everything as it was", async () => {
    const user = await open()

    await user.press(screen.getByRole("button", { name: text.cancel }))

    await waitFor(() => expect(screen.queryByText(text.deleteConfirmMessage)).toBeNull())
    expect(playlistsApi.deletePlaylist).not.toHaveBeenCalled()
    expect(mockRouter.back).not.toHaveBeenCalled()
    expect(library().playlists).toHaveLength(1)
  })

  it("confirming deletes the playlist, leaves the screen and says so", async () => {
    playlistsApi.deletePlaylist.mockResolvedValue(undefined)
    const user = await open()

    await user.press(screen.getByRole("button", { name: text.confirmDelete }))

    await waitFor(() => expect(toast()).toBe(text.deleted))
    expect(playlistsApi.deletePlaylist).toHaveBeenCalledWith("p1")
    expect(mockRouter.back).toHaveBeenCalledTimes(1)
    expect(library().playlists).toEqual([])
  })

  it("goes home when there is no screen to go back to", async () => {
    mockRouter.canGoBack.mockReturnValue(false)
    playlistsApi.deletePlaylist.mockResolvedValue(undefined)
    const user = await open()

    await user.press(screen.getByRole("button", { name: text.confirmDelete }))

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/"))
    expect(mockRouter.back).not.toHaveBeenCalled()
  })

  it("when the server refuses, the playlist comes back and no success toast is shown", async () => {
    playlistsApi.deletePlaylist.mockRejectedValue(refused)
    const user = await open()

    await user.press(screen.getByRole("button", { name: text.confirmDelete }))

    await waitFor(() => expect(toast()).toBe("Not allowed"))
    expect(library().playlists.map((item) => item.id)).toEqual(["p1"])
  })
})

describe("TrackMenuSheet: remove from playlist", () => {
  it("offers it for a track of the user's own playlist, and removes the track", async () => {
    playlistsApi.removeTrackFromPlaylist.mockResolvedValue(detail())
    const onClose = jest.fn()
    const user = userEvent.setup()
    await render(<TrackMenuSheet track={tracks[0]} visible onClose={onClose} playlistId="p1" />)

    await user.press(screen.getByText(text.removeFromPlaylist))

    expect(playlistsApi.removeTrackFromPlaylist).toHaveBeenCalledWith("p1", "a")
    expect(library().playlists[0].trackIds).toEqual(["b"])
    expect(toast()).toBe(`${text.removedFrom} Road trip`)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("is not there for a track that is not shown in one of the user's playlists", async () => {
    await render(<TrackMenuSheet track={tracks[0]} visible onClose={jest.fn()} />)

    expect(screen.getByText(text.addToPlaylist)).toBeOnTheScreen()
    expect(screen.queryByText(text.removeFromPlaylist)).not.toBeOnTheScreen()
  })
})

describe("CollectionView: who can manage a playlist", () => {
  const openMenuOfFirstTrack = async () => {
    const user = userEvent.setup()
    await user.press((await screen.findAllByRole("button", { name: "More options" }))[0])
    return user
  }

  it("the owner gets rename, delete and remove-track", async () => {
    playlistsApi.getPlaylist.mockResolvedValue(detail())
    await render(<CollectionView kind="playlist" id="p1" />)

    expect(await screen.findByRole("button", { name: text.rename })).toBeOnTheScreen()
    expect(screen.getByRole("button", { name: text.delete })).toBeOnTheScreen()
    await openMenuOfFirstTrack()
    expect(await screen.findByText(text.removeFromPlaylist)).toBeOnTheScreen()
  })

  it("an official playlist, or somebody else's, gets none of them", async () => {
    useLibraryStore.setState({ playlists: [playlist({ id: "mine" })] })
    playlistsApi.getPlaylist.mockResolvedValue(detail({ id: "official", isOfficial: true }))
    await render(<CollectionView kind="playlist" id="official" />)

    expect(await screen.findByText("Road trip")).toBeOnTheScreen()
    expect(screen.queryByRole("button", { name: text.rename })).not.toBeOnTheScreen()
    expect(screen.queryByRole("button", { name: text.delete })).not.toBeOnTheScreen()
    await openMenuOfFirstTrack()
    expect(await screen.findByText(text.addToPlaylist)).toBeOnTheScreen()
    expect(screen.queryByText(text.removeFromPlaylist)).not.toBeOnTheScreen()
  })

  it("removing a track makes it disappear from the open playlist", async () => {
    playlistsApi.getPlaylist
      .mockResolvedValueOnce(detail())
      .mockResolvedValue({ ...detail(), trackIds: ["b"], tracks: [tracks[1]] })
    playlistsApi.removeTrackFromPlaylist.mockResolvedValue(detail())
    await render(<CollectionView kind="playlist" id="p1" />)
    const user = await openMenuOfFirstTrack()

    await user.press(await screen.findByText(text.removeFromPlaylist))

    await waitFor(() => expect(screen.queryByText("Title a")).not.toBeOnTheScreen())
    expect(screen.getByText("Title b")).toBeOnTheScreen()
  })
})
