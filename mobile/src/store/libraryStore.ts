import { create } from "zustand"
import * as albumsApi from "@/api/albums"
import * as artistsApi from "@/api/artists"
import * as followsApi from "@/api/follows"
import * as likesApi from "@/api/likes"
import * as playlistsApi from "@/api/playlists"
import * as tracksApi from "@/api/tracks"
import type { ApiPlaylist, LikeKind } from "@/api/types"
import { copy } from "@/constants/copy"
import { describeApiError } from "@/utils/apiErrors"
import { showToast } from "./toastStore"

export type LibraryStatus = "idle" | "loading" | "ready" | "error"

type IdField = "likedTrackIds" | "likedAlbumIds" | "likedPlaylistIds" | "followedArtistIds"

type LibraryState = {
  status: LibraryStatus
  likedTrackIds: string[]
  likedAlbumIds: string[]
  likedPlaylistIds: string[]
  followedArtistIds: string[]
  /** The user's own playlists. */
  playlists: ApiPlaylist[]
  /** Bumped when a playlist's tracks change, so an open playlist screen can reload. */
  playlistRevision: number
}

type LibraryActions = {
  /** Loads the user's likes, follows and playlists from the server. */
  load: () => Promise<void>
  /** Forgets everything (on logout). */
  reset: () => void
  toggleLike: (trackId: string) => Promise<void>
  toggleAlbumLike: (albumId: string) => Promise<void>
  togglePlaylistLike: (playlistId: string) => Promise<void>
  toggleFollow: (artistId: string) => Promise<void>
  addTrackToPlaylist: (playlistId: string, trackId: string) => Promise<void>
  /** Returns the new playlist, or null when it could not be created. */
  createPlaylist: (name: string) => Promise<ApiPlaylist | null>
}

export type LibraryStore = LibraryState & LibraryActions

const initialState: LibraryState = {
  status: "idle",
  likedTrackIds: [],
  likedAlbumIds: [],
  likedPlaylistIds: [],
  followedArtistIds: [],
  playlists: [],
  playlistRevision: 0,
}

/** The same ids with `id` added (newest first) or removed. */
const withId = (ids: string[], id: string, present: boolean): string[] =>
  present ? (ids.includes(id) ? ids : [id, ...ids]) : ids.filter((item) => item !== id)

/** Requests in progress, so a double tap cannot send two opposite requests for one item. */
const inFlight = new Set<string>()

export const useLibraryStore = create<LibraryStore>()((set, get) => {
  const setIds = (field: IdField, id: string, present: boolean) =>
    set((state) => ({ [field]: withId(state[field], id, present) }) as Partial<LibraryState>)

  /**
   * Optimistic toggle: the UI changes at once; if the server refuses, the change is undone and
   * a toast says why.
   */
  const toggle = async (field: IdField, id: string, send: (on: boolean) => Promise<unknown>) => {
    const lock = `${field}:${id}`
    if (inFlight.has(lock)) return
    inFlight.add(lock)

    const wasOn = get()[field].includes(id)
    setIds(field, id, !wasOn)
    try {
      await send(!wasOn)
    } catch (error) {
      setIds(field, id, wasOn)
      showToast(describeApiError(error))
    } finally {
      inFlight.delete(lock)
    }
  }

  const toggleLikeOf = (kind: LikeKind, field: IdField) => (id: string) =>
    toggle(field, id, (on) => likesApi.setLiked(kind, id, on))

  return {
    ...initialState,

    load: async () => {
      set({ status: "loading" })
      try {
        const [tracks, albums, likedPlaylists, artists, mine] = await Promise.all([
          tracksApi.listLikedTracks(),
          albumsApi.listLikedAlbums(),
          playlistsApi.listLikedPlaylists(),
          artistsApi.listFollowedArtists(),
          playlistsApi.listMyPlaylists(),
        ])
        set({
          status: "ready",
          likedTrackIds: tracks.map((track) => track.id),
          likedAlbumIds: albums.map((album) => album.id),
          likedPlaylistIds: likedPlaylists.map((playlist) => playlist.id),
          followedArtistIds: artists.map((artist) => artist.id),
          playlists: mine,
        })
      } catch (error) {
        set({ status: "error" })
        showToast(describeApiError(error))
      }
    },

    reset: () => set(initialState),

    toggleLike: toggleLikeOf("tracks", "likedTrackIds"),
    toggleAlbumLike: toggleLikeOf("albums", "likedAlbumIds"),
    togglePlaylistLike: toggleLikeOf("playlists", "likedPlaylistIds"),
    toggleFollow: (artistId) =>
      toggle("followedArtistIds", artistId, (on) => followsApi.setFollowing(artistId, on)),

    addTrackToPlaylist: async (playlistId, trackId) => {
      const playlist = get().playlists.find((item) => item.id === playlistId)
      if (!playlist) return
      if (playlist.trackIds.includes(trackId)) {
        showToast(`${copy.library.alreadyIn} ${playlist.name}`)
        return
      }

      // Playlists keep their order: a new track goes to the end.
      const change = (add: boolean) =>
        set((state) => ({
          playlists: state.playlists.map((item) =>
            item.id === playlistId
              ? {
                  ...item,
                  trackIds: add
                    ? [...item.trackIds, trackId]
                    : item.trackIds.filter((id) => id !== trackId),
                }
              : item,
          ),
          playlistRevision: state.playlistRevision + 1,
        }))

      change(true)
      showToast(`${copy.library.addedTo} ${playlist.name}`)
      try {
        await playlistsApi.addTrackToPlaylist(playlistId, trackId)
      } catch (error) {
        change(false)
        showToast(describeApiError(error))
      }
    },

    createPlaylist: async (name) => {
      try {
        const { tracks: _tracks, ...playlist } = await playlistsApi.createPlaylist({
          name: name.trim(),
        })
        set((state) => ({ playlists: [...state.playlists, playlist] }))
        return playlist
      } catch (error) {
        showToast(describeApiError(error))
        return null
      }
    },
  }
})
