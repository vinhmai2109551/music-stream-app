import { router } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { StyleSheet, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { BlurredBackdrop } from "@/components/media/BlurredBackdrop"
import { PlayerActions } from "@/components/media/PlayerActions"
import { PlayerArtwork } from "@/components/media/PlayerArtwork"
import { PlayerControls } from "@/components/media/PlayerControls"
import { PlayerHeader } from "@/components/media/PlayerHeader"
import { PlayerTrackInfo } from "@/components/media/PlayerTrackInfo"
import { SeekBar } from "@/components/media/SeekBar"
import { AppText } from "@/components/ui/AppText"
import { Button } from "@/components/ui/Button"
import { SwipeToDismiss } from "@/components/ui/SwipeToDismiss"
import { BASE_COMMENT_COUNT, BASE_LIKE_COUNT, LIKE_COUNT_BUMP } from "@/constants/player"
import { useLibraryStore } from "@/store/libraryStore"
import { showToast } from "@/store/toastStore"
import { usePlayerStore } from "@/store/playerStore"
import { colors, spacing } from "@/theme"

const COMING_SOON = "Coming soon"

const close = () => router.back()

export default function PlayerScreen() {
  const insets = useSafeAreaInsets()

  const track = usePlayerStore((state) => state.currentTrack)
  const isPlaying = usePlayerStore((state) => state.isPlaying)
  const isBuffering = usePlayerStore((state) => state.isBuffering)
  const hasError = usePlayerStore((state) => state.hasError)
  const progress = usePlayerStore((state) => state.progress)
  const duration = usePlayerStore((state) => state.duration)
  const shuffle = usePlayerStore((state) => state.shuffle)
  const repeat = usePlayerStore((state) => state.repeat)
  const source = usePlayerStore((state) => state.queueSource)
  const { togglePlaying, next, previous, seek, toggleShuffle, cycleRepeat, retry } =
    usePlayerStore.getState()

  const liked = useLibraryStore((state) => (track ? state.likedTrackIds.includes(track.id) : false))
  const toggleLike = useLibraryStore((state) => state.toggleLike)

  if (!track) {
    return (
      <View style={[styles.empty, { paddingTop: insets.top }]}>
        <AppText variant="title" color="white">
          Nothing is playing
        </AppText>
        <Button label="Close" variant="glass" onPress={close} style={styles.emptyButton} />
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <BlurredBackdrop source={track.cover} />
      <SwipeToDismiss onDismiss={close}>
        <View
          style={[
            styles.content,
            { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.lg },
          ]}
        >
          <PlayerHeader source={source} onClose={close} onMore={() => showToast(COMING_SOON)} />
          <View style={styles.artwork}>
            <PlayerArtwork source={track.cover} />
          </View>
          <PlayerTrackInfo
            title={track.title}
            artist={track.artist}
            liked={liked}
            onToggleLike={() => toggleLike(track.id)}
          />
          <View style={styles.seek}>
            <SeekBar seed={track.id} progress={progress} duration={duration} onSeek={seek} />
          </View>
          <PlayerControls
            isPlaying={isPlaying}
            isBuffering={isBuffering}
            shuffle={shuffle}
            repeat={repeat}
            onTogglePlay={togglePlaying}
            onNext={next}
            onPrevious={previous}
            onToggleShuffle={toggleShuffle}
            onCycleRepeat={cycleRepeat}
          />
          {hasError && (
            <View style={styles.error}>
              <AppText variant="caption" color="onDarkMuted" style={styles.errorText}>
                Can&apos;t play this track. Check your connection.
              </AppText>
              <Button compact label="Try again" variant="glass" onPress={retry} />
            </View>
          )}
          <View style={styles.spacer} />
          <PlayerActions
            liked={liked}
            likeCount={BASE_LIKE_COUNT + (liked ? LIKE_COUNT_BUMP : 0)}
            commentCount={BASE_COMMENT_COUNT}
            onToggleLike={() => toggleLike(track.id)}
            onComments={() => showToast(COMING_SOON)}
            onShare={() => showToast(COMING_SOON)}
          />
        </View>
      </SwipeToDismiss>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.text },
  content: { flex: 1, paddingHorizontal: spacing.xxl },
  artwork: { marginTop: spacing.xxl, marginBottom: spacing.xl },
  seek: { marginTop: spacing.xl, marginBottom: spacing.sm },
  spacer: { flex: 1 },
  error: { alignItems: "center", gap: spacing.sm, marginTop: spacing.lg },
  errorText: { textAlign: "center" },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xl,
    backgroundColor: colors.text,
  },
  emptyButton: { minWidth: 160 },
})
