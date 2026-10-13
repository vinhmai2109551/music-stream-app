import AsyncStorage from "@react-native-async-storage/async-storage"
import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import { copy } from "@/constants/copy"
import { initialPlaylists } from "@/data/mock"
import { images } from "@/data/images"
import type { Playlist } from "@/types"
import { toggleId } from "@/utils/collections"
import { createId } from "@/utils/createId"

const MAX_RECENT_SEARCHES = 5
const COVERS_BY_ID = new Map(initialPlaylists.map((playlist) => [playlist.id, playlist.cover]))

type LibraryState = {
  likedTrackIds: string[]
  likedPlaylistIds: string[]
  likedAlbumIds: string[]
  followedArtistIds: string[]
  playlists: Playlist[]
  recentSearches: string[]
  isPremium: boolean
}

type LibraryActions = {
  toggleLike: (trackId: string) => void
  togglePlaylistLike: (playlistId: string) => void
  toggleAlbumLike: (albumId: string) => void
  toggleFollow: (artistId: string) => void
  addRecentSearch: (query: string) => void
  removeRecentSearch: (query: string) => void
  clearRecentSearches: () => void
  createPlaylist: (name: string) => string
  renamePlaylist: (playlistId: string, name: string) => void
  deletePlaylist: (playlistId: string) => void
  addTrackToPlaylist: (playlistId: string, trackId: string) => void
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void
  subscribe: () => void
}

export type LibraryStore = LibraryState & LibraryActions

const initialState: LibraryState = {
  likedTrackIds: ["flower", "levitating"],
  likedPlaylistIds: ["top50"],
  likedAlbumIds: ["me-album"],
  followedArtistIds: ["jennifer"],
  playlists: initialPlaylists,
  recentSearches: ["FLOWER", "Ryan Young", "Top 50 Canada"],
  isPremium: false,
}

export const useLibraryStore = create<LibraryStore>()(
  persist(
    (set) => ({
      ...initialState,
      toggleLike: (trackId) => set((s) => ({ likedTrackIds: toggleId(s.likedTrackIds, trackId) })),
      togglePlaylistLike: (id) =>
        set((s) => ({ likedPlaylistIds: toggleId(s.likedPlaylistIds, id) })),
      toggleAlbumLike: (id) => set((s) => ({ likedAlbumIds: toggleId(s.likedAlbumIds, id) })),
      toggleFollow: (id) => set((s) => ({ followedArtistIds: toggleId(s.followedArtistIds, id) })),
      addRecentSearch: (query) => {
        const value = query.trim()
        if (!value) return
        set((s) => ({
          recentSearches: [value, ...s.recentSearches.filter((item) => item !== value)].slice(
            0,
            MAX_RECENT_SEARCHES,
          ),
        }))
      },
      removeRecentSearch: (query) =>
        set((s) => ({ recentSearches: s.recentSearches.filter((item) => item !== query) })),
      clearRecentSearches: () => set({ recentSearches: [] }),
      createPlaylist: (name) => {
        const id = createId("playlist")
        const playlist: Playlist = {
          id,
          name: name.trim(),
          owner: copy.userName,
          trackIds: [],
          cover: images.playlists.fallback,
          description: `Created by ${copy.userName}.`,
          likes: 0,
        }
        set((s) => ({ playlists: [...s.playlists, playlist] }))
        return id
      },
      renamePlaylist: (playlistId, name) =>
        set((s) => ({
          playlists: s.playlists.map((p) =>
            p.id === playlistId ? { ...p, name: name.trim() } : p,
          ),
        })),
      deletePlaylist: (playlistId) =>
        set((s) => ({ playlists: s.playlists.filter((p) => p.id !== playlistId) })),
      addTrackToPlaylist: (playlistId, trackId) =>
        set((s) => ({
          playlists: s.playlists.map((p) =>
            p.id === playlistId && !p.trackIds.includes(trackId)
              ? { ...p, trackIds: [...p.trackIds, trackId] }
              : p,
          ),
        })),
      removeTrackFromPlaylist: (playlistId, trackId) =>
        set((s) => ({
          playlists: s.playlists.map((p) =>
            p.id === playlistId ? { ...p, trackIds: p.trackIds.filter((id) => id !== trackId) } : p,
          ),
        })),
      subscribe: () => set({ isPremium: true }),
    }),
    {
      name: "music-stream-library",
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      // Covers are require() ids that change between builds, so rebuild them on load.
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<LibraryState>
        const playlists = (saved.playlists ?? current.playlists).map((playlist) => ({
          ...playlist,
          cover: COVERS_BY_ID.get(playlist.id) ?? images.playlists.fallback,
        }))
        return { ...current, ...saved, playlists }
      },
    },
  ),
)
