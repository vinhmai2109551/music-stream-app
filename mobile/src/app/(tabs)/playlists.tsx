import { ListMusic, Plus } from "lucide-react-native"
import { useState } from "react"
import { FlatList, Pressable, StyleSheet, View } from "react-native"
import { CreatePlaylistSheet } from "@/components/media/CreatePlaylistSheet"
import { PlaylistRow } from "@/components/media/PlaylistRow"
import { AppText } from "@/components/ui/AppText"
import { Button } from "@/components/ui/Button"
import { EmptyState } from "@/components/ui/EmptyState"
import { Skeleton } from "@/components/ui/Skeleton"
import { TopBar } from "@/components/ui/TopBar"
import { pressedStyle } from "@/components/ui/pressed"
import { copy } from "@/constants/copy"
import { useLibraryStore } from "@/store/libraryStore"
import { colors, radius, shadows, sizes, spacing } from "@/theme"

const SKELETON_ROWS = 3

/** "My Playlists": the playlists the user made, and a button to make another. */
export default function PlaylistsScreen() {
  const playlists = useLibraryStore((state) => state.playlists)
  const status = useLibraryStore((state) => state.status)
  const load = useLibraryStore((state) => state.load)
  const [creating, setCreating] = useState(false)

  return (
    <View style={styles.screen}>
      <TopBar title={copy.playlistsScreen.title} />
      <FlatList
        data={status === "ready" ? playlists : []}
        keyExtractor={(playlist) => playlist.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <AppText variant="h2" accessibilityRole="header" style={styles.heading}>
            {copy.playlistsScreen.heading}
          </AppText>
        }
        ListEmptyComponent={
          status === "ready" ? (
            <EmptyState
              icon={ListMusic}
              title={copy.playlistsScreen.emptyTitle}
              description={copy.playlistsScreen.emptyDescription}
            />
          ) : status === "error" ? (
            <EmptyState
              title={copy.errors.loadFailedTitle}
              description={copy.library.loadFailed}
              action={<Button label={copy.common.retry} onPress={() => void load()} />}
            />
          ) : (
            <View style={styles.skeleton}>
              {Array.from({ length: SKELETON_ROWS }, (_, index) => (
                <Skeleton key={index} height={sizes.trackRowHeight} />
              ))}
            </View>
          )
        }
        renderItem={({ item }) => <PlaylistRow playlist={item} />}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy.playlistsScreen.create}
        onPress={() => setCreating(true)}
        style={({ pressed }) => [styles.fab, pressedStyle(pressed)]}
      >
        <Plus size={sizes.icon} strokeWidth={2} color={colors.white} />
      </Pressable>
      {creating && <CreatePlaylistSheet onClose={() => setCreating(false)} />}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  list: { paddingHorizontal: spacing.screen, paddingBottom: sizes.playButtonLg * 2 },
  heading: { marginVertical: spacing.lg },
  skeleton: { gap: spacing.md },
  fab: {
    position: "absolute",
    right: spacing.screen,
    bottom: spacing.xxl,
    width: sizes.playButtonLg,
    height: sizes.playButtonLg,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.text,
    ...shadows.card,
  },
})
