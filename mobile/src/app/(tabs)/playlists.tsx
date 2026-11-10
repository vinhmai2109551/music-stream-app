import { ListMusic, Plus } from "lucide-react-native"
import { useState } from "react"
import { FlatList, Pressable, View } from "react-native"
import { CreatePlaylistSheet } from "@/components/media/CreatePlaylistSheet"
import { PlaylistRow } from "@/components/media/PlaylistRow"
import { AppText } from "@/components/ui/AppText"
import { Button } from "@/components/ui/Button"
import { EmptyState } from "@/components/ui/EmptyState"
import { Skeleton } from "@/components/ui/Skeleton"
import { TopBar } from "@/components/ui/TopBar"
import { pressedStyle } from "@/components/ui/pressed"
import { useLibraryStore } from "@/store/libraryStore"
import { makeStyles, radius, shadows, sizes, spacing, useColors } from "@/theme"
import { useTranslation } from "@/i18n"

const SKELETON_ROWS = 3

/** "My Playlists": the playlists the user made, and a button to make another. */
export default function PlaylistsScreen() {
  const { t } = useTranslation()

  const styles = useStyles()
  const colors = useColors()

  const playlists = useLibraryStore((state) => state.playlists)
  const status = useLibraryStore((state) => state.status)
  const load = useLibraryStore((state) => state.load)
  const [creating, setCreating] = useState(false)

  return (
    <View style={styles.screen}>
      <TopBar title={t("library.playlists.title")} />
      <FlatList
        data={status === "ready" ? playlists : []}
        keyExtractor={(playlist) => playlist.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <AppText variant="h2" accessibilityRole="header" style={styles.heading}>
            {t("library.playlists.heading")}
          </AppText>
        }
        ListEmptyComponent={
          status === "ready" ? (
            <EmptyState
              icon={ListMusic}
              title={t("library.playlists.emptyTitle")}
              description={t("library.playlists.emptyDescription")}
            />
          ) : status === "error" ? (
            <EmptyState
              title={t("errors.loadFailedTitle")}
              description={t("playlist.loadFailed")}
              action={<Button label={t("common.retry")} onPress={() => void load()} />}
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
        accessibilityLabel={t("library.playlists.create")}
        onPress={() => setCreating(true)}
        style={({ pressed }) => [styles.fab, pressedStyle(pressed)]}
      >
        <Plus size={sizes.icon} strokeWidth={2} color={colors.white} />
      </Pressable>
      {creating && <CreatePlaylistSheet onClose={() => setCreating(false)} />}
    </View>
  )
}

const useStyles = makeStyles((colors) => ({
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
    backgroundColor: colors.elevated,
    ...shadows.card,
  },
}))
