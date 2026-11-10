import { router } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { useState } from "react"
import { Linking, StyleSheet, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { BlurredBackdrop } from "@/components/media/BlurredBackdrop"
import { CommentsSheet } from "@/components/media/CommentsSheet"
import { PlayerActions } from "@/components/media/PlayerActions"
import { PlayerArtwork } from "@/components/media/PlayerArtwork"
import { PlayerControls } from "@/components/media/PlayerControls"
import { PlayerError } from "@/components/media/PlayerError"
import { PlayerHeader } from "@/components/media/PlayerHeader"
import { PlayerTrackInfo } from "@/components/media/PlayerTrackInfo"
import { SeekBar } from "@/components/media/SeekBar"
import { SimilarTracks } from "@/components/media/SimilarTracks"
import { TrackMenuSheet } from "@/components/media/TrackMenuSheet"
import { YouTubeLabel } from "@/components/media/YouTubeLabel"
import { YouTubeSlot } from "@/components/media/YouTubeSlot"
import { AppText } from "@/components/ui/AppText"
import { Button } from "@/components/ui/Button"
import { SwipeToDismiss } from "@/components/ui/SwipeToDismiss"
import {
  BASE_COMMENT_COUNT,
  BASE_LIKE_COUNT,
  LIKE_COUNT_BUMP,
  YOUTUBE_MIN_SIZE,
} from "@/constants/player"
import { useLibraryStore } from "@/store/libraryStore"
import { showToast } from "@/store/toastStore"
import { canAutoSkip, usePlayerStore } from "@/store/playerStore"
import { colors, spacing } from "@/theme"
import { youtubeWatchUrl } from "@/utils/playbackKind"
import { shareTrack } from "@/utils/shareTrack"
import { useTranslation } from "@/i18n"

const close = () => router.back()

const openOnYouTube = (videoId: string, onFailed: () => void) =>
  Linking.openURL(youtubeWatchUrl(videoId)).catch(onFailed)

export default function PlayerScreen() {
  const { t } = useTranslation()

  const insets = useSafeAreaInsets()

  const track = usePlayerStore((state) => state.currentTrack)
  const isPlaying = usePlayerStore((state) => state.isPlaying)
  const isBuffering = usePlayerStore((state) => state.isBuffering)
  const error = usePlayerStore((state) => state.error)
  const playsFromYouTube = usePlayerStore((state) => state.source === "youtube")
  // A network error is retried by hand; any other one makes the player move on by itself.
  const skipping = usePlayerStore(
    (state) => state.error !== null && state.error !== "network" && canAutoSkip(state),
  )
  const progress = usePlayerStore((state) => state.progress)
  const duration = usePlayerStore((state) => state.duration)
  const shuffle = usePlayerStore((state) => state.shuffle)
  const repeat = usePlayerStore((state) => state.repeat)
  const queueSource = usePlayerStore((state) => state.queueSource)
  const { togglePlaying, next, previous, seek, toggleShuffle, cycleRepeat, retry } =
    usePlayerStore.getState()

  const [commentsOpen, setCommentsOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  /** Comments counted once the sheet has been opened; until then the design's sample number. */
  const [commentCount, setCommentCount] = useState<{ trackId: string; count: number } | null>(null)

  const liked = useLibraryStore((state) => (track ? state.likedTrackIds.includes(track.id) : false))
  const toggleLike = useLibraryStore((state) => state.toggleLike)

  if (!track) {
    return (
      <View style={[styles.empty, { paddingTop: insets.top }]}>
        <AppText variant="title" color="white">
          {t("player.nothingPlaying")}
        </AppText>
        <Button
          label={t("common.close")}
          variant="glass"
          onPress={close}
          style={styles.emptyButton}
        />
      </View>
    )
  }

  const videoId = track.youtubeVideoId

  const share = () => shareTrack(track).catch(() => showToast(t("errors.unknown")))

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <BlurredBackdrop source={track.cover} youtubeVideoId={track.youtubeVideoId} />
      <SwipeToDismiss onDismiss={close}>
        <View
          style={[
            styles.content,
            { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.lg },
          ]}
        >
          <PlayerHeader source={queueSource} onClose={close} onMore={() => setMenuOpen(true)} />
          {/* The video takes the place of the cover; it must stay at least 200 x 200 and visible. */}
          <View style={[styles.artwork, playsFromYouTube && styles.video]}>
            {playsFromYouTube ? (
              <YouTubeSlot />
            ) : (
              <PlayerArtwork
                source={track.cover}
                youtubeVideoId={track.youtubeVideoId}
                label={track.title}
              />
            )}
          </View>
          {playsFromYouTube && <YouTubeLabel />}
          <PlayerTrackInfo
            title={track.title}
            artist={track.artist}
            track={track}
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
          {error && (
            <PlayerError
              kind={error}
              skipping={skipping}
              onRetry={retry}
              onOpenYouTube={
                videoId
                  ? () => void openOnYouTube(videoId, () => showToast(t("errors.unknown")))
                  : undefined
              }
            />
          )}
          <View style={styles.actions}>
            <PlayerActions
              liked={liked}
              likeCount={BASE_LIKE_COUNT + (liked ? LIKE_COUNT_BUMP : 0)}
              commentCount={
                commentCount?.trackId === track.id ? commentCount.count : BASE_COMMENT_COUNT
              }
              onToggleLike={() => toggleLike(track.id)}
              onComments={() => setCommentsOpen(true)}
              onShare={() => void share()}
            />
            <SimilarTracks trackId={track.id} />
          </View>
        </View>
      </SwipeToDismiss>
      {menuOpen && <TrackMenuSheet track={track} visible onClose={() => setMenuOpen(false)} />}
      {commentsOpen && (
        <CommentsSheet
          target={{ trackId: track.id }}
          onClose={() => setCommentsOpen(false)}
          onCountChange={(count) => setCommentCount({ trackId: track.id, count })}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  content: { flex: 1, paddingHorizontal: spacing.xxl },
  artwork: { flex: 1, justifyContent: "center", marginVertical: spacing.lg },
  video: { minHeight: YOUTUBE_MIN_SIZE },
  actions: { marginTop: spacing.xl },
  seek: { marginTop: spacing.xl, marginBottom: spacing.sm },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xl,
    backgroundColor: colors.ink,
  },
  emptyButton: { minWidth: 160 },
})
