import { MessageSquare } from "lucide-react-native"
import { useEffect, useMemo, useState } from "react"
import { FlatList, Pressable, StyleSheet, View } from "react-native"
import type { ApiComment, CommentTarget } from "@/api/types"
import { AppText } from "@/components/ui/AppText"
import { BottomSheet } from "@/components/ui/BottomSheet"
import { EmptyState } from "@/components/ui/EmptyState"
import { ErrorState } from "@/components/ui/ErrorState"
import { Skeleton } from "@/components/ui/Skeleton"
import { pressedStyle } from "@/components/ui/pressed"
import { copy } from "@/constants/copy"
import { useComments } from "@/hooks/useComments"
import { sizes, spacing } from "@/theme"
import { buildThreads, type CommentThread } from "@/utils/commentThreads"
import { plural } from "@/utils/plural"
import { CommentComposer } from "./CommentComposer"
import { CommentItem } from "./CommentItem"

const SHEET_HEIGHT = "75%"
const SKELETON_ROWS = 3
/** A thread shows this many replies until it is opened. */
const COLLAPSED_REPLIES = 1

type CommentsSheetProps = {
  /** The track or feed post the comments belong to. */
  target: CommentTarget
  onClose: () => void
  /** Tells the screen behind how many comments there are now. */
  onCountChange?: (count: number) => void
}

/** The comments of a track or post in a bottom sheet, with replies and a box to write one. */
export function CommentsSheet({ target, onClose, onCountChange }: CommentsSheetProps) {
  const { state, reload, post, toggleLike } = useComments(target)
  const [replyTo, setReplyTo] = useState<ApiComment | null>(null)
  const [opened, setOpened] = useState<ReadonlySet<string>>(new Set())

  const comments = state.status === "ready" ? state.comments : null
  const threads = useMemo(() => (comments ? buildThreads(comments) : []), [comments])
  const count = comments?.length ?? 0

  useEffect(() => {
    if (comments) onCountChange?.(comments.length)
  }, [comments, onCountChange])

  const toggleOpened = (id: string) =>
    setOpened((current) => {
      const next = new Set(current)
      if (!next.delete(id)) next.add(id)
      return next
    })

  const send = async (text: string): Promise<boolean> => {
    // A reply to a reply is stored against that reply but shown under the same thread.
    const sent = await post(text, replyTo?.id)
    if (sent) setReplyTo(null)
    return sent
  }

  const title = state.status === "ready" ? `${count} ${plural("comment", count)}` : "Comments"

  return (
    <BottomSheet visible onClose={onClose} title={title} height={SHEET_HEIGHT}>
      <View style={styles.body}>
        {state.status === "loading" && (
          <View style={styles.skeleton}>
            {Array.from({ length: SKELETON_ROWS }, (_, index) => (
              <Skeleton key={index} height={sizes.trackRowHeight} />
            ))}
          </View>
        )}
        {state.status === "error" && (
          <ErrorState error={state.error} onRetry={() => void reload()} />
        )}
        {state.status === "ready" && (
          <FlatList
            data={threads}
            keyExtractor={(thread) => thread.comment.id}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={Separator}
            ListEmptyComponent={
              <EmptyState
                icon={MessageSquare}
                title={copy.comments.emptyTitle}
                description={copy.comments.emptyDescription}
              />
            }
            renderItem={({ item }) => (
              <Thread
                thread={item}
                isOpen={opened.has(item.comment.id)}
                onToggleOpen={toggleOpened}
                onReply={setReplyTo}
                onToggleLike={toggleLike}
              />
            )}
          />
        )}
        <View style={styles.composer}>
          <CommentComposer
            replyingTo={replyTo?.user?.name ?? (replyTo ? "Deleted user" : null)}
            onCancelReply={() => setReplyTo(null)}
            onSend={send}
          />
        </View>
      </View>
    </BottomSheet>
  )
}

type ThreadProps = {
  thread: CommentThread
  isOpen: boolean
  onToggleOpen: (commentId: string) => void
  onReply: (comment: ApiComment) => void
  onToggleLike: (comment: ApiComment) => void
}

function Thread({ thread, isOpen, onToggleOpen, onReply, onToggleLike }: ThreadProps) {
  const { comment, replies } = thread
  const shown = isOpen ? replies : replies.slice(0, COLLAPSED_REPLIES)
  const hidden = replies.length - COLLAPSED_REPLIES

  return (
    <View style={styles.thread}>
      <CommentItem comment={comment} onReply={onReply} onToggleLike={onToggleLike} />
      {shown.map((reply) => (
        <CommentItem
          key={reply.id}
          comment={reply}
          isReply
          onReply={onReply}
          onToggleLike={onToggleLike}
        />
      ))}
      {hidden > 0 && (
        <Pressable
          accessibilityRole="button"
          onPress={() => onToggleOpen(comment.id)}
          style={({ pressed }) => [styles.more, pressedStyle(pressed)]}
        >
          <AppText variant="caption" color="accentText">
            {isOpen
              ? copy.comments.hideReplies
              : `View ${hidden} more ${hidden === 1 ? "reply" : "replies"}`}
          </AppText>
        </Pressable>
      )}
    </View>
  )
}

function Separator() {
  return <View style={styles.separator} />
}

const styles = StyleSheet.create({
  body: { flex: 1 },
  list: { paddingBottom: spacing.lg, flexGrow: 1 },
  skeleton: { flex: 1, gap: spacing.lg },
  separator: { height: spacing.xl },
  thread: { gap: spacing.md },
  more: {
    minHeight: sizes.minTouch,
    justifyContent: "center",
    marginLeft: sizes.userAvatar + spacing.md,
  },
  composer: { paddingTop: spacing.md },
})
