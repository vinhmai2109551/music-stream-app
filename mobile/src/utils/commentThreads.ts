import type { ApiComment, ApiCommentPage, ApiCommentThread } from "@/api/types"

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

/** A comment the user deleted on this screen. It is hidden at once; the server may still refuse. */
export interface Removal {
  /** The thread a reply belonged to; null for a top-level comment. */
  threadId: string | null
  /** How many comments went with it: itself, and for a top-level comment all its replies. */
  weight: number
}

export type Removals = Readonly<Record<string, Removal>>

/** The items that were not deleted. */
export function withoutRemoved<T extends { id: string }>(
  items: readonly T[],
  removed: Removals,
): T[] {
  return items.filter((item) => !(item.id in removed))
}

/** How many replies of a thread were deleted. */
export const removedFromThread = (removed: Removals, threadId: string): number =>
  Object.values(removed).filter((removal) => removal.threadId === threadId).length

/** How many comments in all the deletions took away. */
export const removedWeight = (removed: Removals): number =>
  Object.values(removed).reduce((total, removal) => total + removal.weight, 0)

/** What was loaded or written on a comments screen on top of its first page. */
export interface Overlay {
  /** The first page these belong to; reloading it starts them again. */
  base: ApiCommentPage
  /** Top-level comments from later pages. */
  later: ApiCommentThread[]
  /** Where the next page starts; null when there is none. */
  nextCursor: string | null
  /** Top-level comments written here, newest first. */
  written: ApiCommentThread[]
  /** Older replies fetched, and replies written here, by thread id. */
  replies: Record<string, ApiComment[]>
  /** How many replies were written here, by thread id. */
  writtenReplies: Record<string, number>
  /** Threads whose older replies have all been fetched. */
  exhausted: ReadonlySet<string>
  /** Comments deleted here, by comment id. */
  removed: Removals
}

export const startOverlay = (base: ApiCommentPage): Overlay => ({
  base,
  later: [],
  nextCursor: base.nextCursor,
  written: [],
  replies: {},
  writtenReplies: {},
  exhausted: new Set(),
  removed: {},
})
