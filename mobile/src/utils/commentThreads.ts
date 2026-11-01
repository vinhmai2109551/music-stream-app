import type { ApiComment, ApiCommentThread } from "@/api/types"

/** A top-level comment with the replies loaded so far, oldest first. */
export interface CommentThread {
  comment: ApiComment
  replies: ApiComment[]
  /** Replies that exist but are not on screen yet; 0 once everything that can load has loaded. */
  hiddenReplies: number
}

const byAge = (a: ApiComment, b: ApiComment): number =>
  Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id.localeCompare(b.id)

/** Keeps the first item of every id. */
export function uniqueById<T extends { id: string }>(items: readonly T[]): T[] {
  const seen = new Set<string>()
  return items.filter((item) => !seen.has(item.id) && !!seen.add(item.id))
}

/** Joins lists of replies of one thread: no duplicates, oldest first. */
export function mergeReplies(...lists: readonly (readonly ApiComment[])[]): ApiComment[] {
  return uniqueById(lists.flat()).sort(byAge)
}

/**
 * One thread as the screen shows it. `loaded` are the replies fetched or written on this screen;
 * they join the ones that came with the comment. The server counts only what it knew when the
 * page was fetched, so the replies written here (`writtenCount`) are added to its count.
 * `exhausted` means the server has no older replies left, whatever the count says.
 */
export function buildThread(
  root: ApiCommentThread,
  loaded: readonly ApiComment[],
  writtenCount: number,
  exhausted: boolean,
): CommentThread {
  const { replies: preview, repliesCount, ...comment } = root
  const replies = mergeReplies(preview, loaded)
  const total = repliesCount + writtenCount
  return { comment, replies, hiddenReplies: exhausted ? 0 : Math.max(0, total - replies.length) }
}
