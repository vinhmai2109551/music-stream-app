import { Rss } from "lucide-react-native"
import { useState } from "react"
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { ApiFeedPost } from "@/api/types"
import { CommentsSheet } from "@/components/media/CommentsSheet"
import { FeedPostCard } from "@/components/media/FeedPostCard"
import { AppText } from "@/components/ui/AppText"
import { EmptyState } from "@/components/ui/EmptyState"
import { ErrorState } from "@/components/ui/ErrorState"
import { Skeleton } from "@/components/ui/Skeleton"
import { copy } from "@/constants/copy"
import { useFeed } from "@/hooks/useFeed"
import { colors, radius, sizes, spacing } from "@/theme"

const SKELETON_POSTS = 2
const END_REACHED_THRESHOLD = 0.6

export default function FeedScreen() {
  const insets = useSafeAreaInsets()
  const feed = useFeed()
  const [openPost, setOpenPost] = useState<ApiFeedPost | null>(null)
  /** Comment counts after the user has opened a post's comments (they may have added some). */
  const [counts, setCounts] = useState<Record<string, number>>({})

  const header = (
    <AppText variant="h2" accessibilityRole="header" style={styles.title}>
      {copy.feed.title}
    </AppText>
  )

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.lg }]}>
      {feed.status === "loading" && (
        <View style={styles.padded}>
          {header}
          {Array.from({ length: SKELETON_POSTS }, (_, index) => (
            <FeedSkeleton key={index} />
          ))}
        </View>
      )}
      {feed.status === "error" && (
        <View style={styles.padded}>
          {header}
          <ErrorState error={feed.error} onRetry={() => void feed.reload()} />
        </View>
      )}
      {feed.status === "ready" && (
        <FlatList
          data={feed.items}
          keyExtractor={(post) => post.id}
          ListHeaderComponent={header}
          ItemSeparatorComponent={Separator}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onEndReached={() => void feed.loadMore()}
          onEndReachedThreshold={END_REACHED_THRESHOLD}
          refreshControl={
            <RefreshControl
              refreshing={feed.refreshing}
              onRefresh={() => void feed.refresh()}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={Rss}
              title={copy.feed.emptyTitle}
              description={copy.feed.emptyDescription}
            />
          }
          ListFooterComponent={
            feed.loadingMore ? (
              <ActivityIndicator color={colors.accent} style={styles.footer} />
            ) : undefined
          }
          renderItem={({ item }) => (
            <FeedPostCard
              post={item}
              commentsCount={counts[item.id] ?? item.commentsCount}
              onOpenComments={setOpenPost}
            />
          )}
        />
      )}
      {openPost && (
        <CommentsSheet
          target={{ postId: openPost.id }}
          onClose={() => setOpenPost(null)}
          onCountChange={(count) =>
            setCounts((current) =>
              current[openPost.id] === count ? current : { ...current, [openPost.id]: count },
            )
          }
        />
      )}
    </View>
  )
}

function FeedSkeleton() {
  return (
    <View style={styles.skeleton}>
      <View style={styles.skeletonAuthor}>
        <Skeleton width={sizes.userAvatar} height={sizes.userAvatar} rounded={radius.pill} />
        <Skeleton width={160} height={sizes.iconMd} />
      </View>
      <Skeleton height={280} rounded={radius.cover} />
    </View>
  )
}

function Separator() {
  return <View style={styles.separator} />
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  padded: { paddingHorizontal: spacing.screen },
  title: { marginBottom: spacing.lg },
  list: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xxxl },
  separator: { height: spacing.xxxl },
  footer: { paddingVertical: spacing.xl },
  skeleton: { gap: spacing.md, marginBottom: spacing.xxl },
  skeletonAuthor: { flexDirection: "row", alignItems: "center", gap: spacing.md },
})
