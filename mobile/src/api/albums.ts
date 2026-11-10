import { api } from "./client"
import { pathId, toQuery } from "./query"
import type { AlbumQuery, ApiAlbum, ApiAlbumDetail, Page } from "./types"

export const listAlbums = (query: AlbumQuery = {}) =>
  api.get<Page<ApiAlbum>>(`/albums${toQuery(query)}`)

/** The album with its tracks, in play order. */
export const getAlbum = (id: string) => api.get<ApiAlbumDetail>(`/albums/${pathId(id)}`)

/** Albums the current user saved, most recently saved first. */
export const listLikedAlbums = () => api.get<ApiAlbum[]>("/albums/liked")
