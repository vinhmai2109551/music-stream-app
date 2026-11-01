import { useRef, useState } from "react"
import {
  createComment,
  likeComment,
  listComments,
  listReplies,
  unlikeComment,
} from "@/api/comments"
import type { ApiComment, ApiCommentPage, ApiCommentThread, CommentTarget } from "@/api/types"
import { showToast } from "@/store/toastStore"
import { describeApiError } from "@/utils/apiErrors"
import { buildThread, mergeReplies, uniqueById, type CommentThread } from "@/utils/commentThreads"
import { useResource } from "./useResource"

const targetKey = (target: CommentTarget): string =>
  "trackId" in target ? `track:${target.trackId}` : `post:${target.postId}`

/** What was loaded or written on this screen on top of the first page. */
type Overlay = {
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
}

const startOverlay = (base: ApiCommentPage): Overlay => ({
  base,
  later: [],
  nextCursor: base.nextCursor,
  written: [],
  replies: {},
  writtenReplies: {},
  exhausted: new Set(),
})

/**
 * Comments of a track or a feed post, newest first, loaded a page at a time, with replies,
 * posting and liking.
 */
export function useComments(target: CommentTarget) {
  const { state, reload } = useResource(() => listComments(target), targetKey(target))
  const [overlay, setOverlay] = useState<Overlay | null>(null)
  /** Likes the user changed here: comment id -> liked. They show before the server confirms. */
  const [likeChanges, setLikeChanges] = useState<Record<string, boolean>>({})
  const [loadingMore, setLoadingMore] = useState(false)
  const [moreFailed, setMoreFailed] = useState(false)
  /** Ids of the threads whose older replies are being fetched. */
  const [loadingReplies, setLoadingReplies] = useState<ReadonlySet<string>>(new Set())
  /** Requests in flight (the page of comments, or the id of a thread), so none is sent twice. */
  const inFlight = useRef(new Set<string>())

  const base = state.status === "ready" ? state.data : null
  const view = base ? (overlay?.base === base ? overlay : startOverlay(base)) : null

  /** Changes the overlay of `page`, unless the screen has moved to another first page. */
  const change = (page: ApiCommentPage, apply: (current: Overlay) => Overlay) =>
    setOverlay((current) => apply(current?.base === page ? current : startOverlay(page)))

  const withLikes = (comment: ApiComment): ApiComment => {
    const liked = likeChanges[comment.id]
    if (liked === undefined || liked === comment.liked) return comment
    return { ...comment, liked, likesCount: comment.likesCount + (liked ? 1 : -1) }
  }

  const threads: CommentThread[] = view
    ? uniqueById([...view.written, ...view.base.items, ...view.later]).map((root) => {
        const thread = buildThread(
          root,
          view.replies[root.id] ?? [],
          view.writtenReplies[root.id] ?? 0,
          view.exhausted.has(root.id),
        )
        return {
          ...thread,
          comment: withLikes(thread.comment),
          replies: thread.replies.map(withLikes),
        }
      })
    : []

  const written = view
    ? view.written.length + Object.values(view.writtenReplies).reduce((sum, n) => sum + n, 0)
    : 0

  /** Loads the next page of top-level comments. */
  const loadMore = async () => {
    if (!base || !view?.nextCursor || inFlight.current.has("page")) return
    inFlight.current.add("page")
    setLoadingMore(true)
    setMoreFailed(false)
    try {
      const page = await listComments(target, { cursor: view.nextCursor })
      change(base, (current) => ({
        ...current,
        later: [...current.later, ...page.items],
        nextCursor: page.nextCursor,
      }))
    } catch (error) {
      setMoreFailed(true)
      showToast(describeApiError(error))
    } finally {
      inFlight.current.delete("page")
      setLoadingMore(false)
    }
  }

  /** Loads the replies older than the ones of `thread` that are on screen. */
  const loadMoreReplies = async (thread: CommentThread) => {
    const oldest = thread.replies[0]
    const id = thread.comment.id
    if (!base || !oldest || inFlight.current.has(id)) return
    inFlight.current.add(id)
    setLoadingReplies((current) => new Set(current).add(id))
    try {
      const page = await listReplies(id, { cursor: oldest.id })
      change(base, (current) => ({
        ...current,
        replies: { ...current.replies, [id]: mergeReplies(current.replies[id] ?? [], page.items) },
        exhausted:
          page.nextCursor === null ? new Set([...current.exhausted, id]) : current.exhausted,
      }))
    } catch (error) {
      showToast(describeApiError(error))
    } finally {
      inFlight.current.delete(id)
      setLoadingReplies((current) => {
        const next = new Set(current)
        next.delete(id)
        return next
      })
    }
  }

  /** Adds a comment (or a reply). Returns false when it could not be sent. */
  const post = async (text: string, parentId?: string): Promise<boolean> => {
    if (!base) return false
    try {
      const created = await createComment({ ...target, text, parentId })
      change(base, (current) => {
        // A reply belongs to a top-level comment (created.parentId), even when it answered a reply.
        const threadId = created.parentId
        if (threadId) {
          return {
            ...current,
            replies: {
              ...current.replies,
              [threadId]: mergeReplies(current.replies[threadId] ?? [], [created]),
            },
            writtenReplies: {
              ...current.writtenReplies,
              [threadId]: (current.writtenReplies[threadId] ?? 0) + 1,
            },
          }
        }
        return {
          ...current,
          written: [{ ...created, replies: [], repliesCount: 0 }, ...current.written],
        }
      })
      return true
    } catch (error) {
      showToast(describeApiError(error))
      return false
    }
  }

  /** Likes or unlikes at once; the change is undone if the server refuses. */
  const toggleLike = async (comment: ApiComment) => {
    const next = !comment.liked
    setLikeChanges((current) => ({ ...current, [comment.id]: next }))
    try {
      await (next ? likeComment(comment.id) : unlikeComment(comment.id))
    } catch (error) {
      setLikeChanges((current) => ({ ...current, [comment.id]: comment.liked }))
      showToast(describeApiError(error))
    }
  }

  return {
    state: base
      ? {
          status: "ready" as const,
          threads,
          /** Every comment, replies included, also those not loaded yet. */
          total: base.total + written,
          hasMore: view?.nextCursor != null,
          loadingMore,
          moreFailed,
          loadingReplies,
        }
      : state.status === "error"
        ? state
        : { status: "loading" as const },
    reload: () => {
      setMoreFailed(false)
      return reload()
    },
    loadMore,
    loadMoreReplies,
    post,
    toggleLike,
  }
}
