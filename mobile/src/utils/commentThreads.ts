import type { ApiComment } from "@/api/types"

/** A top-level comment with every reply under it (replies to replies included), oldest first. */
export interface CommentThread {
  comment: ApiComment
  replies: ApiComment[]
}

/**
 * Groups a flat list (oldest first) into threads. A reply to a reply is shown under the same
 * top-level comment, so the thread stays one level deep like in the design.
 */
export function buildThreads(comments: readonly ApiComment[]): CommentThread[] {
  const byId = new Map(comments.map((comment) => [comment.id, comment]))
  const threads = new Map<string, CommentThread>()
  const rootOf = (comment: ApiComment): ApiComment => {
    let current = comment
    const seen = new Set<string>()
    while (current.parentId && !seen.has(current.id)) {
      seen.add(current.id)
      const parent = byId.get(current.parentId)
      if (!parent) break
      current = parent
    }
    return current
  }

  for (const comment of comments) {
    const root = rootOf(comment)
    let thread = threads.get(root.id)
    if (!thread) {
      thread = { comment: root, replies: [] }
      threads.set(root.id, thread)
    }
    if (comment.id !== root.id) thread.replies.push(comment)
  }
  return [...threads.values()]
}
