import { Headphones } from "lucide-react-native"
import { StyleSheet, View } from "react-native"
import { copy } from "@/constants/copy"
import { sizes, useColors } from "@/theme"
import type { Track } from "@/types"
import { getPlaybackKind } from "@/utils/playbackKind"

type BackgroundBadgeProps = {
  track: Pick<Track, "youtubeVideoId" | "audioUrl">
  /** For the dark player screen. */
  onDark?: boolean
}

/**
 * A small headphones icon on tracks that play from an audio file: unlike a YouTube video they keep
 * playing with the screen off. Shows nothing for the other tracks.
 */
export function BackgroundBadge({ track, onDark = false }: BackgroundBadgeProps) {
  const colors = useColors()

  if (getPlaybackKind(track) !== "r2") return null
  return (
    <View accessible accessibilityLabel={copy.player.backgroundBadge} style={styles.badge}>
      <Headphones size={sizes.iconSm} color={onDark ? colors.onDarkMuted : colors.accentText} />
    </View>
  )
}

const styles = StyleSheet.create({
  badge: { justifyContent: "center" },
})
