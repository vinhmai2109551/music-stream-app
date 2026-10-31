import { router } from "expo-router"
import { MonitorPlay, X } from "lucide-react-native"
import { Pressable, StyleSheet, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { AppText } from "@/components/ui/AppText"
import { IconButton } from "@/components/ui/IconButton"
import { pressedStyle } from "@/components/ui/pressed"
import { copy } from "@/constants/copy"
import { YOUTUBE_MIN_SIZE } from "@/constants/player"
import { usePlayerStore } from "@/store/playerStore"
import { useVideoSlotStore } from "@/store/videoSlotStore"
import { colors, radius, shadows, sizes, spacing } from "@/theme"
import { YouTubePlayerView } from "./YouTubePlayerView"

/**
 * The one YouTube player of the app, mounted above every screen so the video keeps playing when
 * the player screen is closed. On the player screen it fills the slot the screen reserved; on any
 * other screen it floats above the mini player as a card that is exactly as big as YouTube
 * requires (200 x 200) and is never hidden.
 */
export function YouTubeHost() {
  const insets = useSafeAreaInsets()
  const visible = usePlayerStore(
    (state) => state.currentTrack !== null && state.source === "youtube",
  )
  const slot = useVideoSlotStore((state) => state.slot)
  if (!visible) return null

  // The same view in both places, so the video does not reload when it moves.
  const placement = slot
    ? {
        position: "absolute" as const,
        left: slot.x,
        top: slot.y,
        width: slot.width,
        height: slot.height,
      }
    : [styles.card, { bottom: insets.bottom + FLOATING_BOTTOM }]

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View style={placement}>
        {!slot && <FloatingHeader />}
        <YouTubePlayerView />
      </View>
    </View>
  )
}

/** Above the tab bar and the mini player. */
const FLOATING_BOTTOM =
  sizes.tabBarContent + sizes.miniPlayerHeight + sizes.progressBar + spacing.sm + spacing.md

const openPlayer = () => router.push("/player")
const stopPlayback = () => usePlayerStore.getState().reset()

function FloatingHeader() {
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open player"
        onPress={openPlayer}
        style={({ pressed }) => [styles.label, pressedStyle(pressed)]}
      >
        <MonitorPlay size={sizes.iconSm} color={colors.onDarkMuted} />
        <AppText variant="small" color="white" numberOfLines={1} ellipsizeMode="tail">
          {copy.player.viaYoutube}
        </AppText>
      </Pressable>
      <IconButton icon={X} label="Stop playback" color="white" onPress={stopPlayback} />
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    position: "absolute",
    right: spacing.sm,
    width: YOUTUBE_MIN_SIZE,
    overflow: "hidden",
    borderRadius: radius.card,
    backgroundColor: colors.text,
    ...shadows.card,
  },
  header: { height: sizes.minTouch, flexDirection: "row", alignItems: "center" },
  label: {
    flex: 1,
    minWidth: 0,
    height: sizes.minTouch,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingLeft: spacing.md,
  },
})
