import { useState } from "react"
import { createComment, likeComment, listComments, unlikeComment } from "@/api/comments"
import type { ApiComment, CommentTarget } from "@/api/types"
import { showToast } from "@/store/toastStore"
import { describeApiError } from "@/utils/apiErrors"
import { useResource } from "./useResource"

const targetKey = (target: CommentTarget): string =>
  "trackId" in target ? `track:${target.trackId}` : `post:${target.postId}`

/** Comments written here, kept for the list they were added to. */
type Added = { base: ApiComment[]; items: ApiComment[] }

/** Comments of a track or a feed post (oldest first), with posting and liking. */
export function useComments(target: CommentTarget) {
  const { state, reload } = useResource(() => listComments(target), targetKey(target))
  const [added, setAdded] = useState<Added | null>(null)
  /** Likes the user changed here: comment id -> liked. They show before the server confirms. */
  const [likeChanges, setLikeChanges] = useState<Record<string, boolean>>({})

  const base = state.status === "ready" ? state.data : null
  const written = added && added.base === base ? added.items : []
  const comments = base
    ? [...base, ...written].map((comment) => {
        const liked = likeChanges[comment.id]
        if (liked === undefined || liked === comment.liked) return comment
        return { ...comment, liked, likesCount: comment.likesCount + (liked ? 1 : -1) }
      })
    : null

  /** Adds a comment (or a reply). Returns false when it could not be sent. */
  const post = async (text: string, parentId?: string): Promise<boolean> => {
    if (!base) return false
    try {
      const created = await createComment({ ...target, text, parentId })
      setAdded({ base, items: [...written, created] })
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
    state:
      comments === null
        ? state.status === "error"
          ? state
          : { status: "loading" as const }
        : { status: "ready" as const, comments },
    reload,
    post,
    toggleLike,
  }
}
