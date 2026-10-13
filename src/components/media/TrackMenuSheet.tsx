import { Image } from "expo-image"
import { Heart, ListPlus } from "lucide-react-native"
import { Pressable, ScrollView, StyleSheet, View } from "react-native"
import { AppText } from "@/components/ui/AppText"
import { BottomSheet } from "@/components/ui/BottomSheet"
import { pressedStyle } from "@/components/ui/pressed"
import { useLibraryStore } from "@/store/libraryStore"
import { colors, radius, sizes, spacing } from "@/theme"
import type { Track } from "@/types"

type TrackMenuSheetProps = {
  track: Track
  visible: boolean
  onClose: () => void
  onNotify?: (message: string) => void
}

export function TrackMenuSheet({ track, visible, onClose, onNotify }: TrackMenuSheetProps) {
  const liked = useLibraryStore((state) => state.likedTrackIds.includes(track.id))
  const playlists = useLibraryStore((state) => state.playlists)
  const toggleLike = useLibraryStore((state) => state.toggleLike)
  const addTrackToPlaylist = useLibraryStore((state) => state.addTrackToPlaylist)

  const addTo = (playlistId: string, name: string) => {
    addTrackToPlaylist(playlistId, track.id)
    onClose()
    onNotify?.(`Added to ${name}`)
  }

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.header}>
        <Image source={track.cover} contentFit="cover" style={styles.cover} />
        <View style={styles.headerText}>
          <AppText variant="subtitle" numberOfLines={1} ellipsizeMode="tail">
            {track.title}
          </AppText>
          <AppText variant="caption" color="secondary" numberOfLines={1} ellipsizeMode="tail">
            {track.artist}
          </AppText>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => toggleLike(track.id)}
        style={({ pressed }) => [styles.row, styles.divided, pressedStyle(pressed)]}
      >
        <Heart
          size={sizes.icon}
          color={liked ? colors.like : colors.secondary}
          fill={liked ? colors.like : "none"}
        />
        <AppText variant="bodyMedium" style={styles.flex}>
          {liked ? "Remove from liked songs" : "Like this track"}
        </AppText>
      </Pressable>
      <AppText variant="caption" color="secondary" style={styles.sectionTitle}>
        Add to playlist
      </AppText>
      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {playlists.map((playlist) => (
          <Pressable
            key={playlist.id}
            accessibilityRole="button"
            onPress={() => addTo(playlist.id, playlist.name)}
            style={({ pressed }) => [styles.row, pressedStyle(pressed)]}
          >
            <Image source={playlist.cover} contentFit="cover" style={styles.playlistCover} />
            <View style={styles.flex}>
              <AppText variant="bodyMedium" numberOfLines={1} ellipsizeMode="tail">
                {playlist.name}
              </AppText>
              <AppText variant="small" color="secondary">
                {playlist.trackIds.length} songs
              </AppText>
            </View>
            <ListPlus size={sizes.iconMd} color={colors.secondary} />
          </Pressable>
        ))}
      </ScrollView>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  headerText: { flex: 1, minWidth: 0 },
  cover: { width: sizes.cover, height: sizes.cover, borderRadius: radius.cover },
  row: {
    minHeight: sizes.minTouch + spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  divided: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
  flex: { flex: 1, minWidth: 0 },
  sectionTitle: { marginTop: spacing.xl, marginBottom: spacing.sm },
  list: { maxHeight: sizes.collectionCover + sizes.coverMd },
  playlistCover: { width: sizes.coverSm, height: sizes.coverSm, borderRadius: radius.cover },
})
