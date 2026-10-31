import { router } from "expo-router"
import { Heart, Pause, Play } from "lucide-react-native"
import { memo, useEffect } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated"
import { AppText } from "@/components/ui/AppText"
import { CoverImage } from "@/components/ui/CoverImage"
import { IconButton } from "@/components/ui/IconButton"
import { useLibraryStore } from "@/store/libraryStore"
import { usePlayerStore } from "@/store/playerStore"
import { colors, radius, shadows, sizes, spacing } from "@/theme"
import { youTubeSource } from "@/utils/youtubeSource"

const PROGRESS_ANIMATION_MS = 500

function MiniPlayerBase() {
  const track = usePlayerStore((state) => state.currentTrack)
  const isPlaying = usePlayerStore((state) => state.isPlaying)
  const fromYouTube = usePlayerStore((state) => state.source === "youtube")
  const progress = usePlayerStore((state) => state.progress)
  const duration = usePlayerStore((state) => state.duration)
  const togglePlaying = usePlayerStore((state) => state.togglePlaying)
  const liked = useLibraryStore((state) => (track ? state.likedTrackIds.includes(track.id) : false))
  const toggleLike = useLibraryStore((state) => state.toggleLike)

  const onTogglePlay = () => {
    togglePlaying()
    // A YouTube video only plays while the player screen is open, so starting one opens it.
    if (!isPlaying && fromYouTube && !youTubeSource.isAttached()) router.push("/player")
  }

  const ratio = useSharedValue(0)
  useEffect(() => {
    const value = track && duration > 0 ? Math.min(1, progress / duration) : 0
    ratio.value = withTiming(value, { duration: PROGRESS_ANIMATION_MS })
  }, [progress, duration, track, ratio])
  const barStyle = useAnimatedStyle(() => ({ width: `${ratio.value * 100}%` }))

  if (!track) return null

  return (
    <View style={styles.container}>
      <View style={styles.track}>
        <Animated.View style={[styles.bar, barStyle]} />
      </View>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open player, ${track.title} by ${track.artist}`}
          onPress={() => router.push("/player")}
          style={({ pressed }) => [styles.info, pressed && styles.pressed]}
        >
          <CoverImage
            source={track.cover}
            youtubeVideoId={track.youtubeVideoId}
            style={styles.cover}
          />
          <View style={styles.text}>
            <AppText variant="caption" color="white" numberOfLines={1} ellipsizeMode="tail">
              {track.title}
            </AppText>
            <AppText variant="small" color="onDarkMuted" numberOfLines={1} ellipsizeMode="tail">
              {track.artist}
            </AppText>
          </View>
        </Pressable>
        <IconButton
          icon={Heart}
          label={liked ? "Unlike" : "Like"}
          active={liked}
          color="white"
          activeColor="like"
          onPress={() => toggleLike(track.id)}
        />
        <IconButton
          icon={isPlaying ? Pause : Play}
          label={isPlaying ? "Pause" : "Play"}
          color="white"
          onPress={onTogglePlay}
        />
      </View>
    </View>
  )
}

export const MiniPlayer = memo(MiniPlayerBase)

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.sm,
    marginBottom: spacing.sm,
    overflow: "hidden",
    borderRadius: radius.card,
    backgroundColor: colors.text,
    ...shadows.card,
  },
  track: { height: sizes.progressBar, backgroundColor: colors.onDarkFaint },
  bar: { height: "100%", backgroundColor: colors.accent },
  row: {
    height: sizes.miniPlayerHeight,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: spacing.sm,
  },
  info: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  pressed: { opacity: 0.8 },
  cover: { width: sizes.cover, height: sizes.cover, borderRadius: radius.cover },
  text: { flex: 1, minWidth: 0 },
})
