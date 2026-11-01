import { MessageSquare } from "lucide-react-native"
import { useEffect, useState } from "react"
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from "react-native"
import type { ApiComment, CommentTarget } from "@/api/types"
import { AppText } from "@/components/ui/AppText"
import { BottomSheet } from "@/components/ui/BottomSheet"
import { EmptyState } from "@/components/ui/EmptyState"
import { ErrorState } from "@/components/ui/ErrorState"
import { Skeleton } from "@/components/ui/Skeleton"
import { pressedStyle } from "@/components/ui/pressed"
import { copy } from "@/constants/copy"
import { useComments } from "@/hooks/useComments"
import { colors, sizes, spacing } from "@/theme"
import { plural } from "@/utils/plural"
import { CommentComposer } from "./CommentComposer"
import { CommentThreadItem } from "./CommentThreadItem"

const SHEET_HEIGHT = "75%"
const SKELETON_ROWS = 3
/** Fraction of a screen from the end at which the next page starts loading. */
const END_REACHED_THRESHOLD = 0.5

type CommentsSheetProps = {
  /** The track or feed post the comments belong to. */
  target: CommentTarget
  onClose: () => void
  /** Tells the screen behind how many comments there are now. */
  onCountChange?: (count: number) => void
}

/** The comments of a track or post in a bottom sheet, with replies and a box to write one. */
export function CommentsSheet({ target, onClose, onCountChange }: CommentsSheetProps) {
  const { state, reload, loadMore, loadMoreReplies, post, toggleLike } = useComments(target)
  const [replyTo, setReplyTo] = useState<ApiComment | null>(null)

  const total = state.status === "ready" ? state.total : null
  useEffect(() => {
    if (total !== null) onCountChange?.(total)
  }, [total, onCountChange])

  const send = async (text: string): Promise<boolean> => {
    // A reply to a reply is stored under the same top-level comment.
    const sent = await post(text, replyTo?.id)
    if (sent) setReplyTo(null)
    return sent
  }

  const title = total !== null ? `${total} ${plural("comment", total)}` : "Comments"

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
            data={state.threads}
            keyExtractor={(thread) => thread.comment.id}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={Separator}
            onEndReached={() => void loadMore()}
            onEndReachedThreshold={END_REACHED_THRESHOLD}
            ListEmptyComponent={
              <EmptyState
                icon={MessageSquare}
                title={copy.comments.emptyTitle}
                description={copy.comments.emptyDescription}
              />
            }
            ListFooterComponent={
              state.loadingMore ? (
                <ActivityIndicator color={colors.accent} style={styles.footer} />
              ) : state.moreFailed ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void loadMore()}
                  style={({ pressed }) => [styles.footer, pressedStyle(pressed)]}
                >
                  <AppText variant="caption" color="accentText">
                    {copy.comments.loadMoreFailed}
                  </AppText>
                </Pressable>
              ) : undefined
            }
            renderItem={({ item }) => (
              <CommentThreadItem
                thread={item}
                loadingReplies={state.loadingReplies.has(item.comment.id)}
                onLoadMoreReplies={loadMoreReplies}
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

function Separator() {
  return <View style={styles.separator} />
}

const styles = StyleSheet.create({
  body: { flex: 1 },
  list: { paddingBottom: spacing.lg, flexGrow: 1 },
  skeleton: { flex: 1, gap: spacing.lg },
  separator: { height: spacing.xl },
  footer: {
    minHeight: sizes.minTouch,
    alignItems: "center",
    justifyContent: "center",
  },
  composer: { paddingTop: spacing.md },
})
