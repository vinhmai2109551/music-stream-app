import { api } from "./client"
import { pathId, toQuery } from "./query"
import type { ApiArtist, Page, PageQuery } from "./types"

export const listArtists = (query: PageQuery = {}) =>
  api.get<Page<ApiArtist>>(`/artists${toQuery(query)}`)

export const getArtist = (id: string) => api.get<ApiArtist>(`/artists/${pathId(id)}`)

/** Artists the current user follows, most recently followed first. */
export const listFollowedArtists = () => api.get<ApiArtist[]>("/artists/followed")
