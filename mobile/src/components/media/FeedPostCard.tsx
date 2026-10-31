import { router } from "expo-router"
import {
  BadgeCheck,
  Ellipsis,
  Heart,
  MessageSquare,
  Play,
  Repeat2,
  User,
} from "lucide-react-native"
import { memo, useState } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import { likeFeedPost, unlikeFeedPost } from "@/api/feed"
import type { ApiFeedPost } from "@/api/types"
import { AppText } from "@/components/ui/AppText"
import { CoverImage } from "@/components/ui/CoverImage"
import { IconButton } from "@/components/ui/IconButton"
import { pressedStyle } from "@/components/ui/pressed"
import { copy } from "@/constants/copy"
import { usePlayerStore } from "@/store/playerStore"
import { showToast } from "@/store/toastStore"
import { describeApiError } from "@/utils/apiErrors"
import { colors, radius, sizes, spacing } from "@/theme"
import { formatCount } from "@/utils/formatCount"
import { formatTime } from "@/utils/formatTime"
import { formatTimeAgo } from "@/utils/formatTimeAgo"

const COMING_SOON = "Coming soon"
const AUTHOR_AVATAR = 44
const CAPTION_LINES = 2

type FeedPostCardProps = {
  post: ApiFeedPost
  onOpenComments: (post: ApiFeedPost) => void
  /** How many comments the post has now, when the user has just added some. */
  commentsCount: number
}

/** One post of the feed: who posted it, the artwork with its track, and the like / comment row. */
function FeedPostCardBase({ post, onOpenComments, commentsCount }: FeedPostCardProps) {
  const [liked, setLiked] = useState(post.liked)
  const [likes, setLikes] = useState(post.likesCount)
  const playFromList = usePlayerStore((state) => state.playFromList)
  const { artist, track } = post

  const toggleLike = async () => {
    const next = !liked
    setLiked(next)
    setLikes((count) => count + (next ? 1 : -1))
    try {
      await (next ? likeFeedPost(post.id) : unlikeFeedPost(post.id))
    } catch (error) {
      setLiked(!next)
      setLikes((count) => count + (next ? -1 : 1))
      showToast(describeApiError(error))
    }
  }

  const openArtist = () => {
    if (artist) router.push({ pathname: "/artist/[id]", params: { id: artist.id } })
  }

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={artist ? `Artist ${artist.name}` : "Artist"}
        disabled={!artist}
        onPress={openArtist}
        style={({ pressed }) => [styles.author, pressedStyle(pressed)]}
      >
        <CoverImage
          source={artist?.image ?? ""}
          label={artist?.name}
          icon={User}
          style={{ width: AUTHOR_AVATAR, height: AUTHOR_AVATAR, borderRadius: radius.pill }}
        />
        <View style={styles.authorText}>
          <View style={styles.nameRow}>
            <AppText variant="subtitle" numberOfLines={1} ellipsizeMode="tail" style={styles.name}>
              {artist?.name ?? "Music Stream"}
            </AppText>
            <BadgeCheck size={sizes.iconSm} color={colors.accent} />
          </View>
          <AppText variant="small" color="secondary">
            {copy.feed.postedTrack} · {formatTimeAgo(post.createdAt)}
          </AppText>
        </View>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={track ? `Play ${track.title} by ${track.artist}` : "Post artwork"}
        disabled={!track}
        onPress={() => track && playFromList([track], 0, copy.feed.title)}
        style={({ pressed }) => [styles.artworkWrap, pressedStyle(pressed)]}
      >
        <CoverImage
          source={post.artwork}
          youtubeVideoId={track?.youtubeVideoId}
          label={track?.title ?? artist?.name}
          style={styles.artwork}
        />
        {track && (
          <View style={styles.overlay}>
            <View style={styles.overlayText}>
              <AppText variant="title" color="white" numberOfLines={1} ellipsizeMode="tail">
                {track.title}
              </AppText>
              <AppText variant="caption" color="onDarkMuted" numberOfLines={1}>
                {track.artist}
              </AppText>
            </View>
            <View style={styles.stats}>
              <Play size={sizes.iconSm} color={colors.white} />
              <AppText variant="caption" color="white">
                {formatCount(track.plays)} · {formatTime(track.duration)}
              </AppText>
            </View>
          </View>
        )}
      </Pressable>

      <View style={styles.actions}>
        <Action
          icon={Heart}
          label={liked ? "Unlike post" : "Like post"}
          count={likes}
          active={liked}
          onPress={() => void toggleLike()}
        />
        <Action
          icon={MessageSquare}
          label="Comments"
          count={commentsCount}
          onPress={() => onOpenComments(post)}
        />
        <Action icon={Repeat2} label="Repost" onPress={() => showToast(COMING_SOON)} />
        <View style={styles.spacer} />
        <IconButton icon={Ellipsis} label="More options" onPress={() => showToast(COMING_SOON)} />
      </View>
      {post.caption.length > 0 && (
        <AppText
          variant="body"
          color="secondary"
          numberOfLines={CAPTION_LINES}
          ellipsizeMode="tail"
        >
          {post.caption}
        </AppText>
      )}
    </View>
  )
}

export const FeedPostCard = memo(FeedPostCardBase)

type ActionProps = {
  icon: typeof Heart
  label: string
  count?: number
  active?: boolean
  onPress: () => void
}

function Action({ icon: Icon, label, count, active = false, onPress }: ActionProps) {
  const tint = active ? colors.like : colors.secondary
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.action, pressedStyle(pressed)]}
    >
      <Icon size={sizes.iconMd} color={tint} fill={active ? tint : "none"} />
      {count !== undefined && (
        <AppText variant="bodyMedium" color={active ? "like" : "secondary"}>
          {formatCount(count)}
        </AppText>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  author: {
    minHeight: sizes.minTouch,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  authorText: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  name: { flexShrink: 1 },
  artworkWrap: { aspectRatio: 1, borderRadius: radius.cover, overflow: "hidden" },
  artwork: { width: "100%", height: "100%" },
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.playerScrim,
  },
  overlayText: { flex: 1, minWidth: 0 },
  stats: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  actions: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  action: {
    minHeight: sizes.minTouch,
    minWidth: sizes.minTouch,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingRight: spacing.md,
  },
  spacer: { flex: 1 },
})
