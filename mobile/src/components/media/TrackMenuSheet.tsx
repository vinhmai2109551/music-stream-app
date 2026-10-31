import { Image } from "expo-image"
import { Heart, ListPlus, Plus } from "lucide-react-native"
import { useState } from "react"
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native"
import { AppText } from "@/components/ui/AppText"
import { CoverImage } from "@/components/ui/CoverImage"
import { BottomSheet } from "@/components/ui/BottomSheet"
import { Button } from "@/components/ui/Button"
import { Skeleton } from "@/components/ui/Skeleton"
import { pressedStyle } from "@/components/ui/pressed"
import { copy } from "@/constants/copy"
import { images } from "@/data/images"
import { useLibraryStore } from "@/store/libraryStore"
import { colors, radius, sizes, spacing, typography } from "@/theme"
import type { Track } from "@/types"
import { plural } from "@/utils/plural"

const MAX_PLAYLIST_NAME = 100

type TrackMenuSheetProps = {
  track: Track
  visible: boolean
  onClose: () => void
}

export function TrackMenuSheet({ track, visible, onClose }: TrackMenuSheetProps) {
  const liked = useLibraryStore((state) => state.likedTrackIds.includes(track.id))
  const playlists = useLibraryStore((state) => state.playlists)
  const libraryStatus = useLibraryStore((state) => state.status)
  const loadLibrary = useLibraryStore((state) => state.load)
  const toggleLike = useLibraryStore((state) => state.toggleLike)
  const addTrackToPlaylist = useLibraryStore((state) => state.addTrackToPlaylist)
  const createPlaylist = useLibraryStore((state) => state.createPlaylist)

  const [creating, setCreating] = useState(false)
  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)

  const addTo = (playlistId: string) => {
    void addTrackToPlaylist(playlistId, track.id)
    onClose()
  }

  const createAndAdd = async () => {
    if (!name.trim() || saving) return
    setSaving(true)
    const playlist = await createPlaylist(name)
    setSaving(false)
    if (!playlist) return
    setName("")
    setCreating(false)
    addTo(playlist.id)
  }

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.header}>
        <CoverImage
          source={track.cover}
          youtubeVideoId={track.youtubeVideoId}
          style={styles.cover}
        />
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
        accessibilityState={{ disabled: libraryStatus !== "ready" }}
        disabled={libraryStatus !== "ready"}
        onPress={() => void toggleLike(track.id)}
        style={({ pressed }) => [
          styles.row,
          styles.divided,
          libraryStatus !== "ready" && styles.waiting,
          pressedStyle(pressed),
        ]}
      >
        <Heart
          size={sizes.icon}
          color={liked ? colors.like : colors.secondary}
          fill={liked ? colors.like : "none"}
        />
        <AppText variant="bodyMedium" style={styles.flex}>
          {liked ? "Remove from liked songs" : "Add to liked songs"}
        </AppText>
      </Pressable>
      <AppText variant="caption" color="secondary" style={styles.sectionTitle}>
        {copy.library.addToPlaylist}
      </AppText>
      <ScrollView
        style={styles.list}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {libraryStatus === "idle" || libraryStatus === "loading" ? (
          <View style={styles.row}>
            <Skeleton width={sizes.coverSm} height={sizes.coverSm} />
            <Skeleton width="60%" height={sizes.iconMd} />
          </View>
        ) : null}
        {libraryStatus === "error" && (
          <View style={styles.row}>
            <AppText variant="caption" color="secondary" style={styles.flex}>
              {copy.library.loadFailed}
            </AppText>
            <Button
              compact
              variant="tonal"
              label={copy.common.retry}
              onPress={() => void loadLibrary()}
            />
          </View>
        )}
        {libraryStatus === "ready" && playlists.length === 0 && !creating && (
          <AppText variant="caption" color="secondary" style={styles.empty}>
            {copy.library.noPlaylists}
          </AppText>
        )}
        {playlists.map((playlist) => (
          <Pressable
            key={playlist.id}
            accessibilityRole="button"
            onPress={() => addTo(playlist.id)}
            style={({ pressed }) => [styles.row, pressedStyle(pressed)]}
          >
            <Image
              source={playlist.cover ?? images.playlists.fallback}
              contentFit="cover"
              style={styles.playlistCover}
            />
            <View style={styles.flex}>
              <AppText variant="bodyMedium" numberOfLines={1} ellipsizeMode="tail">
                {playlist.name}
              </AppText>
              <AppText variant="small" color="secondary">
                {playlist.trackIds.length} {plural("song", playlist.trackIds.length)}
              </AppText>
            </View>
            <ListPlus size={sizes.iconMd} color={colors.secondary} />
          </Pressable>
        ))}
        {creating ? (
          <View style={styles.createRow}>
            <TextInput
              autoFocus
              value={name}
              onChangeText={setName}
              onSubmitEditing={() => void createAndAdd()}
              placeholder={copy.library.playlistNamePlaceholder}
              placeholderTextColor={colors.secondary}
              selectionColor={colors.accent}
              maxLength={MAX_PLAYLIST_NAME}
              returnKeyType="done"
              editable={!saving}
              style={styles.input}
            />
            <Button
              compact
              label={copy.library.createPlaylist}
              loading={saving}
              disabled={!name.trim()}
              onPress={() => void createAndAdd()}
            />
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => setCreating(true)}
            style={({ pressed }) => [styles.row, pressedStyle(pressed)]}
          >
            <View style={[styles.playlistCover, styles.plus]}>
              <Plus size={sizes.iconMd} color={colors.accentText} />
            </View>
            <AppText variant="bodyMedium" color="accentText" style={styles.flex}>
              {copy.library.newPlaylist}
            </AppText>
          </Pressable>
        )}
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
  waiting: { opacity: 0.5 },
  divided: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
  flex: { flex: 1, minWidth: 0 },
  sectionTitle: { marginTop: spacing.xl, marginBottom: spacing.sm },
  list: { maxHeight: sizes.collectionCover + sizes.coverMd },
  empty: { paddingVertical: spacing.sm },
  playlistCover: { width: sizes.coverSm, height: sizes.coverSm, borderRadius: radius.cover },
  plus: { alignItems: "center", justifyContent: "center", backgroundColor: colors.accentSoft },
  createRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: sizes.minTouch + spacing.sm,
  },
  input: {
    flex: 1,
    height: sizes.minTouch,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: sizes.borderThin,
    borderColor: colors.divider,
    color: colors.text,
    ...typography.body,
  },
})
