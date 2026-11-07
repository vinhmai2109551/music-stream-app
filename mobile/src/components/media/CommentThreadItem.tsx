import { memo } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import type { ApiComment } from "@/api/types"
import { AppText } from "@/components/ui/AppText"
import { pressedStyle } from "@/components/ui/pressed"
import { copy } from "@/constants/copy"
import { sizes, spacing } from "@/theme"
import type { CommentThread } from "@/utils/commentThreads"
import { CommentItem } from "./CommentItem"

type CommentThreadItemProps = {
  thread: CommentThread
  /** The older replies of this thread are being fetched. */
  loadingReplies: boolean
  onLoadMoreReplies: (thread: CommentThread) => void
  onReply: (comment: ApiComment) => void
  onToggleLike: (comment: ApiComment) => void
  onDelete: (comment: ApiComment) => void
}

/** A comment with its replies; older replies that are not on screen yet load on request. */
function CommentThreadItemBase({
  thread,
  loadingReplies,
  onLoadMoreReplies,
  onReply,
  onToggleLike,
  onDelete,
}: CommentThreadItemProps) {
  const { comment, replies, hiddenReplies } = thread

  return (
    <View style={styles.thread}>
      <CommentItem
        comment={comment}
        onReply={onReply}
        onToggleLike={onToggleLike}
        onDelete={onDelete}
      />
      {hiddenReplies > 0 && (
        <Pressable
          accessibilityRole="button"
          disabled={loadingReplies}
          onPress={() => onLoadMoreReplies(thread)}
          style={({ pressed }) => [styles.more, pressedStyle(pressed)]}
        >
          <AppText variant="caption" color="accentText">
            {loadingReplies
              ? copy.comments.loadingReplies
              : `View ${hiddenReplies} more ${hiddenReplies === 1 ? "reply" : "replies"}`}
          </AppText>
        </Pressable>
      )}
      {replies.map((reply) => (
        <CommentItem
          key={reply.id}
          comment={reply}
          isReply
          onReply={onReply}
          onToggleLike={onToggleLike}
          onDelete={onDelete}
        />
      ))}
    </View>
  )
}

export const CommentThreadItem = memo(CommentThreadItemBase)

const styles = StyleSheet.create({
  thread: { gap: spacing.md },
  more: {
    minHeight: sizes.minTouch,
    justifyContent: "center",
    marginLeft: sizes.userAvatar + spacing.md,
  },
})
