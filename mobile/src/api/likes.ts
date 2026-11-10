import { api } from "./client"
import { pathId } from "./query"
import type { LikeKind } from "./types"

/** Both calls are idempotent. */
export const like = (kind: LikeKind, id: string) =>
  api.put<{ liked: boolean }>(`/likes/${kind}/${pathId(id)}`)

export const unlike = (kind: LikeKind, id: string) =>
  api.delete<{ liked: boolean }>(`/likes/${kind}/${pathId(id)}`)

/** Likes or unlikes depending on `on`. */
export const setLiked = (kind: LikeKind, id: string, on: boolean) =>
  on ? like(kind, id) : unlike(kind, id)
