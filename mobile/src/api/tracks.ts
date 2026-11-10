import { api } from "./client"
import { pathId, toQuery } from "./query"
import type { ApiTrack, Page, TrackQuery } from "./types"

/** Most played first; filter with `q` (title or artist), `artistId` and `region`. */
export const listTracks = (query: TrackQuery = {}) =>
  api.get<Page<ApiTrack>>(`/tracks${toQuery(query)}`)

export const getTrack = (id: string) => api.get<ApiTrack>(`/tracks/${pathId(id)}`)

/** Tracks the current user liked, most recently liked first. */
export const listLikedTracks = () => api.get<ApiTrack[]>("/tracks/liked")

/**
 * Counts one play. Call it once per listen (the app does so after 30 seconds). It needs a login.
 * `counted` is false when the server ignored it because the user just played the same track.
 */
export const recordPlay = (id: string) =>
  api.post<{ plays: number; counted: boolean }>(`/tracks/${pathId(id)}/play`)
