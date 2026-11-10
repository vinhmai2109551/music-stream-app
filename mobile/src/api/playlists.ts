import { api } from "./client"
import { pathId, toQuery } from "./query"
import type {
  ApiPlaylist,
  ApiPlaylistDetail,
  CreatePlaylistInput,
  Page,
  PageQuery,
  UpdatePlaylistInput,
} from "./types"

/** Editorial playlists ("Music Stream"), visible to everyone. */
export const listOfficialPlaylists = (query: PageQuery = {}) =>
  api.get<Page<ApiPlaylist>>(`/playlists${toQuery(query)}`)

/** The current user's own playlists. */
export const listMyPlaylists = () => api.get<ApiPlaylist[]>("/playlists/mine")

export const listLikedPlaylists = () => api.get<ApiPlaylist[]>("/playlists/liked")

/** 404 for playlists the user is not allowed to see. */
export const getPlaylist = (id: string) => api.get<ApiPlaylistDetail>(`/playlists/${pathId(id)}`)

export const createPlaylist = (input: CreatePlaylistInput) =>
  api.post<ApiPlaylistDetail>("/playlists", input)

export const updatePlaylist = (id: string, input: UpdatePlaylistInput) =>
  api.patch<ApiPlaylistDetail>(`/playlists/${pathId(id)}`, input)

export const deletePlaylist = (id: string) => api.delete<void>(`/playlists/${pathId(id)}`)

/** Adds the track to the end of the playlist. Idempotent. */
export const addTrackToPlaylist = (playlistId: string, trackId: string) =>
  api.put<ApiPlaylistDetail>(`/playlists/${pathId(playlistId)}/tracks/${pathId(trackId)}`)

export const removeTrackFromPlaylist = (playlistId: string, trackId: string) =>
  api.delete<ApiPlaylistDetail>(`/playlists/${pathId(playlistId)}/tracks/${pathId(trackId)}`)
