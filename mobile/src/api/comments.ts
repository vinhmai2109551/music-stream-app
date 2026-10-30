import { api } from "./client"
import { pathId, toQuery } from "./query"
import type { ApiComment, CommentTarget, CreateCommentInput } from "./types"

/** Oldest first, so replies come after the comment they answer. */
export const listComments = (target: CommentTarget) =>
  api.get<ApiComment[]>(`/comments${toQuery(target)}`)

export const createComment = (input: CreateCommentInput) => api.post<ApiComment>("/comments", input)

export const deleteComment = (id: string) => api.delete<void>(`/comments/${pathId(id)}`)

export const likeComment = (id: string) =>
  api.put<{ liked: boolean }>(`/comments/${pathId(id)}/like`)

export const unlikeComment = (id: string) =>
  api.delete<{ liked: boolean }>(`/comments/${pathId(id)}/like`)
