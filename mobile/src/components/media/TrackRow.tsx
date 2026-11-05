import { Ellipsis, Heart } from "lucide-react-native"
import { memo, useState } from "react"
import { Pressable, View } from "react-native"
import { AppText } from "@/components/ui/AppText"
import { CoverImage } from "@/components/ui/CoverImage"
import { IconButton } from "@/components/ui/IconButton"
import { pressedStyle } from "@/components/ui/pressed"
import { copy } from "@/constants/copy"
import { useLibraryStore } from "@/store/libraryStore"
import { usePlayerStore } from "@/store/playerStore"
import { makeStyles, radius, sizes, spacing } from "@/theme"
import type { Track } from "@/types"
import { formatCount } from "@/utils/formatCount"
import { formatTime } from "@/utils/formatTime"
import { BackgroundBadge } from "./BackgroundBadge"
import { Equalizer } from "./Equalizer"
import { TrackMenuSheet } from "./TrackMenuSheet"

type TrackRowProps = {
  track: Track
  index: number
  /** The list this track belongs to; becomes the play queue. */
  list: Track[]
  numbered?: boolean
  source?: string
  /** What sits at the end of the row: the "more" menu, or a heart that un-likes the track. */
  trailing?: "menu" | "like"
}

function TrackRowBase({
  track,
  index,
  list,
  numbered = false,
  source = copy.defaultSource,
  trailing = "menu",
}: TrackRowProps) {
  const styles = useStyles()

  const active = usePlayerStore((state) => state.currentTrack?.id === track.id)
  const playing = usePlayerStore((state) => state.currentTrack?.id === track.id && state.isPlaying)
  const playFromList = usePlayerStore((state) => state.playFromList)
  const liked = useLibraryStore((state) => state.likedTrackIds.includes(track.id))
  const toggleLike = useLibraryStore((state) => state.toggleLike)
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <View style={[styles.row, active && styles.active]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Play ${track.title} by ${track.artist}`}
        accessibilityState={{ selected: active }}
        onPress={() => playFromList(list, index, source)}
        style={({ pressed }) => [styles.main, pressedStyle(pressed)]}
      >
        {numbered && (
          <View style={styles.number}>
            {playing ? (
              <Equalizer />
            ) : (
              <AppText variant="caption" color={active ? "accentText" : "secondary"}>
                {index + 1}
              </AppText>
            )}
          </View>
        )}
        <CoverImage
          source={track.cover}
          youtubeVideoId={track.youtubeVideoId}
          label={track.title}
          style={styles.cover}
        />
        <View style={styles.text}>
          <View style={styles.titleRow}>
            <AppText
              variant="subtitle"
              color={active ? "accentText" : "text"}
              numberOfLines={1}
              ellipsizeMode="tail"
              style={styles.title}
            >
              {track.title}
            </AppText>
            <BackgroundBadge track={track} />
          </View>
          <AppText variant="caption" color="secondary" numberOfLines={1} ellipsizeMode="tail">
            {track.artist} · {formatCount(track.plays)} · {formatTime(track.duration)}
          </AppText>
        </View>
      </Pressable>
      {trailing === "like" ? (
        <IconButton
          icon={Heart}
          label={liked ? "Unlike" : "Like"}
          active={liked}
          activeColor="like"
          onPress={() => void toggleLike(track.id)}
        />
      ) : (
        <>
          <IconButton icon={Ellipsis} label="More options" onPress={() => setMenuOpen(true)} />
          {menuOpen && (
            <TrackMenuSheet track={track} visible={menuOpen} onClose={() => setMenuOpen(false)} />
          )}
        </>
      )}
    </View>
  )
}

export const TrackRow = memo(TrackRowBase)

const useStyles = makeStyles((colors) => ({
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
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  title: { flexShrink: 1 },
}))
