import { ThumbsUp, User } from "lucide-react-native"
import { memo } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import type { ApiComment } from "@/api/types"
import { AppText } from "@/components/ui/AppText"
import { CoverImage } from "@/components/ui/CoverImage"
import { IconButton } from "@/components/ui/IconButton"
import { pressedStyle } from "@/components/ui/pressed"
import { copy } from "@/constants/copy"
import { radius, sizes, spacing } from "@/theme"
import { formatTimeAgo } from "@/utils/formatTimeAgo"
import { plural } from "@/utils/plural"

const REPLY_AVATAR = 28

type CommentItemProps = {
  comment: ApiComment
  /** A reply is drawn smaller and sits under its comment. */
  isReply?: boolean
  onReply: (comment: ApiComment) => void
  onToggleLike: (comment: ApiComment) => void
}

/** One comment: who, what, when, likes and a reply button. */
function CommentItemBase({ comment, isReply = false, onReply, onToggleLike }: CommentItemProps) {
  const name = comment.user?.name ?? "Deleted user"
  const avatar = isReply ? REPLY_AVATAR : sizes.userAvatar

  return (
    <View style={[styles.row, isReply && styles.reply]}>
      <CoverImage
        source={comment.user?.avatarUrl ?? ""}
        label={name}
        icon={User}
        style={{ width: avatar, height: avatar, borderRadius: radius.pill }}
      />
      <View style={styles.body}>
        <AppText variant="body">
          <AppText variant="subtitle">{name}</AppText> {comment.text}
        </AppText>
        <View style={styles.meta}>
          <AppText variant="small" color="secondary">
            {formatTimeAgo(comment.createdAt)}
          </AppText>
          {comment.likesCount > 0 && (
            <AppText variant="small" color={comment.liked ? "accentText" : "secondary"}>
              {comment.likesCount} {plural("like", comment.likesCount)}
            </AppText>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${copy.comments.reply} ${name}`}
            onPress={() => onReply(comment)}
            hitSlop={8}
            style={({ pressed }) => [styles.replyButton, pressedStyle(pressed)]}
          >
            <AppText variant="small" color="secondary">
              {copy.comments.reply}
            </AppText>
          </Pressable>
        </View>
      </View>
      <IconButton
        icon={ThumbsUp}
        label={comment.liked ? copy.comments.unlikeComment : copy.comments.likeComment}
        active={comment.liked}
        size={sizes.iconMd}
        onPress={() => onToggleLike(comment)}
      />
    </View>
  )
}

export const CommentItem = memo(CommentItemBase)

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  reply: { marginLeft: sizes.userAvatar + spacing.md },
  body: { flex: 1, minWidth: 0, gap: spacing.xs },
  meta: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  replyButton: { minHeight: spacing.xxl, justifyContent: "center" },
})
