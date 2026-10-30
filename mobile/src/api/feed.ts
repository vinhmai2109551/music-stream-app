import { api } from "./client"
import { pathId, toQuery } from "./query"
import type { ApiFeedPost, Page, PageQuery } from "./types"

/** Newest posts first. */
export const listFeed = (query: PageQuery = {}) =>
  api.get<Page<ApiFeedPost>>(`/feed${toQuery(query)}`)

export const likeFeedPost = (id: string) => api.put<{ liked: boolean }>(`/feed/${pathId(id)}/like`)

export const unlikeFeedPost = (id: string) =>
  api.delete<{ liked: boolean }>(`/feed/${pathId(id)}/like`)
