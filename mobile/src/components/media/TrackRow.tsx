import { Image } from "expo-image"
import { Ellipsis } from "lucide-react-native"
import { memo, useState } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import { AppText } from "@/components/ui/AppText"
import { IconButton } from "@/components/ui/IconButton"
import { pressedStyle } from "@/components/ui/pressed"
import { copy } from "@/constants/copy"
import { usePlayerStore } from "@/store/playerStore"
import { colors, radius, sizes, spacing } from "@/theme"
import type { Track } from "@/types"
import { formatCount } from "@/utils/formatCount"
import { formatTime } from "@/utils/formatTime"
import { Equalizer } from "./Equalizer"
import { TrackMenuSheet } from "./TrackMenuSheet"

type TrackRowProps = {
  track: Track
  index: number
  /** The list this track belongs to; becomes the play queue. */
  list: Track[]
  numbered?: boolean
  source?: string
  onNotify?: (message: string) => void
}

function TrackRowBase({
  track,
  index,
  list,
  numbered = false,
  source = copy.defaultSource,
  onNotify,
}: TrackRowProps) {
  const active = usePlayerStore((state) => state.currentTrack?.id === track.id)
  const playing = usePlayerStore((state) => state.currentTrack?.id === track.id && state.isPlaying)
  const playFromList = usePlayerStore((state) => state.playFromList)
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <View style={[styles.row, active && styles.active]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Play ${track.title} by ${track.artist}`}
        onPress={() => playFromList(list, index, source)}
        style={({ pressed }) => [styles.main, pressedStyle(pressed)]}
      >
        {numbered && (
          <View style={styles.number}>
            {playing ? (
              <Equalizer />
            ) : (
              <AppText variant="caption" color={active ? "accent" : "tertiary"}>
                {index + 1}
              </AppText>
            )}
          </View>
        )}
        <Image source={track.cover} contentFit="cover" style={styles.cover} />
        <View style={styles.text}>
          <AppText
            variant="subtitle"
            color={active ? "accent" : "text"}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {track.title}
          </AppText>
          <AppText variant="caption" color="secondary" numberOfLines={1} ellipsizeMode="tail">
            {track.artist} · {formatCount(track.plays)} · {formatTime(track.duration)}
          </AppText>
        </View>
      </Pressable>
      <IconButton icon={Ellipsis} label="More options" onPress={() => setMenuOpen(true)} />
      {menuOpen && (
        <TrackMenuSheet
          track={track}
          visible={menuOpen}
          onClose={() => setMenuOpen(false)}
          onNotify={onNotify}
        />
      )}
    </View>
  )
}

export const TrackRow = memo(TrackRowBase)

const styles = StyleSheet.create({
  row: {
    minHeight: sizes.trackRowHeight,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.cover,
    paddingLeft: spacing.sm,
  },
  active: { backgroundColor: colors.accentFaint },
  main: {
    flex: 1,
    minWidth: 0,
    minHeight: sizes.trackRowHeight,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  number: { width: sizes.trackNumberWidth, alignItems: "center" },
  cover: { width: sizes.cover, height: sizes.cover, borderRadius: radius.cover },
  text: { flex: 1, minWidth: 0 },
})
