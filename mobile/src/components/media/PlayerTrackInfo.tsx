import { Heart } from "lucide-react-native"
import { StyleSheet, View } from "react-native"
import { AppText } from "@/components/ui/AppText"
import { IconButton } from "@/components/ui/IconButton"
import type { Track } from "@/types"
import { spacing } from "@/theme"
import { BackgroundBadge } from "./BackgroundBadge"
import { useTranslation } from "@/i18n"

type PlayerTrackInfoProps = {
  title: string
  artist: string
  /** Decides whether the "plays in the background" badge shows. */
  track: Pick<Track, "youtubeVideoId" | "audioUrl">
  liked: boolean
  onToggleLike: () => void
}

export function PlayerTrackInfo({
  title,
  artist,
  track,
  liked,
  onToggleLike,
}: PlayerTrackInfoProps) {
  const { t } = useTranslation()

  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <View style={styles.titleRow}>
          <AppText
            variant="h2"
            color="white"
            numberOfLines={1}
            ellipsizeMode="tail"
            style={styles.title}
          >
            {title}
          </AppText>
          <BackgroundBadge track={track} onDark />
        </View>
        <AppText color="onDarkMuted" numberOfLines={1} ellipsizeMode="tail">
          {artist}
        </AppText>
      </View>
      <IconButton
        icon={Heart}
        label={liked ? t("player.unlikeTrack") : t("player.likeTrack")}
        active={liked}
        color="white"
        activeColor="like"
        onPress={onToggleLike}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  text: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { flexShrink: 1 },
})
