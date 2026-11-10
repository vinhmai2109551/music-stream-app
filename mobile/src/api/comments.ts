import { api } from "./client"
import { pathId, toQuery } from "./query"
import type {
  ApiComment,
  ApiCommentPage,
  CommentTarget,
  CreateCommentInput,
  CursorPage,
  CursorQuery,
} from "./types"

/**
 * Top-level comments, newest first, a page at a time (pass the last `nextCursor` as `cursor`).
 * Each comes with its 3 newest replies.
 */
export const listComments = (target: CommentTarget, query: CursorQuery = {}) =>
  api.get<ApiCommentPage>(`/comments${toQuery({ ...target, ...query })}`)

/**
 * Replies of a comment, newest first. For the ones older than those on screen, pass the id of
 * the oldest reply you have as `cursor`.
 */
export const listReplies = (commentId: string, query: CursorQuery = {}) =>
  api.get<CursorPage<ApiComment>>(`/comments/${pathId(commentId)}/replies${toQuery(query)}`)

export const createComment = (input: CreateCommentInput) => api.post<ApiComment>("/comments", input)

export const deleteComment = (id: string) => api.delete<void>(`/comments/${pathId(id)}`)

export const likeComment = (id: string) =>
  api.put<{ liked: boolean }>(`/comments/${pathId(id)}/like`)

export const unlikeComment = (id: string) =>
  api.delete<{ liked: boolean }>(`/comments/${pathId(id)}/like`)
