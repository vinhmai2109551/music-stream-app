import { Headphones } from "lucide-react-native"
import { StyleSheet, View } from "react-native"
import { sizes, useColors } from "@/theme"
import type { Track } from "@/types"
import { getPlaybackKind } from "@/utils/playbackKind"
import { useTranslation } from "@/i18n"

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
  const { t } = useTranslation()

  const colors = useColors()

  if (getPlaybackKind(track) !== "r2") return null
  return (
    <View accessible accessibilityLabel={t("player.backgroundBadge")} style={styles.badge}>
      <Headphones size={sizes.iconSm} color={onDark ? colors.onDarkMuted : colors.accentText} />
    </View>
  )
}

const styles = StyleSheet.create({
  badge: { justifyContent: "center" },
})
