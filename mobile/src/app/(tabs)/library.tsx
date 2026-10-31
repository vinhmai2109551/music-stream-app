import { router, useFocusEffect } from "expo-router"
import { Library, Search } from "lucide-react-native"
import { useCallback, useRef, useState } from "react"
import { FlatList, ScrollView, StyleSheet, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { ApiAlbum, ApiArtist, ApiPlaylist, ApiTrack } from "@/api/types"
import { AlbumRow } from "@/components/media/AlbumRow"
import { ArtistRow } from "@/components/media/ArtistRow"
import { PlaylistRow } from "@/components/media/PlaylistRow"
import { TrackRow } from "@/components/media/TrackRow"
import { AppText } from "@/components/ui/AppText"
import { Chip } from "@/components/ui/Chip"
import { EmptyState } from "@/components/ui/EmptyState"
import { ErrorState } from "@/components/ui/ErrorState"
import { IconButton } from "@/components/ui/IconButton"
import { Skeleton } from "@/components/ui/Skeleton"
import { copy } from "@/constants/copy"
import { useLibraryLists, type LibraryLists } from "@/hooks/useLibraryLists"
import { useLibraryStore } from "@/store/libraryStore"
import { colors, sizes, spacing } from "@/theme"

type Filter = "songs" | "albums" | "artists"

const CHIPS: readonly { filter: Filter; label: string }[] = [
  { filter: "songs", label: copy.libraryScreen.chips.songs },
  { filter: "albums", label: copy.libraryScreen.chips.albums },
  { filter: "artists", label: copy.libraryScreen.chips.artists },
]
const SKELETON_ROWS = 6
const SOURCE = "Liked songs"

type Item =
  | { key: string; kind: "playlist"; playlist: ApiPlaylist }
  | { key: string; kind: "track"; track: ApiTrack; index: number }
  | { key: string; kind: "album"; album: ApiAlbum }
  | { key: string; kind: "artist"; artist: ApiArtist }

const openPlaylists = () => router.navigate("/playlists")
const openSearch = () => router.navigate("/search")

function buildItems(
  filter: Filter | null,
  lists: LibraryLists,
  ownPlaylists: ApiPlaylist[],
): Item[] {
  const items: Item[] = []
  if (filter === null) {
    const own = new Set(ownPlaylists.map((playlist) => playlist.id))
    for (const playlist of [
      ...ownPlaylists,
      ...lists.likedPlaylists.filter((p) => !own.has(p.id)),
    ]) {
      items.push({ key: `playlist:${playlist.id}`, kind: "playlist", playlist })
    }
  }
  if (filter === null || filter === "songs") {
    lists.tracks.forEach((track, index) =>
      items.push({ key: `track:${track.id}`, kind: "track", track, index }),
    )
  }
  if (filter === null || filter === "albums") {
    for (const album of lists.albums) items.push({ key: `album:${album.id}`, kind: "album", album })
  }
  if (filter === null || filter === "artists") {
    for (const artist of lists.artists) {
      items.push({ key: `artist:${artist.id}`, kind: "artist", artist })
    }
  }
  return items
}

export default function LibraryScreen() {
  const insets = useSafeAreaInsets()
  const { state, reload, refresh } = useLibraryLists()
  const ownPlaylists = useLibraryStore((library) => library.playlists)
  const [filter, setFilter] = useState<Filter | null>(null)

  // Coming back to the tab shows what was liked or followed in the meantime.
  const firstFocus = useRef(true)
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) firstFocus.current = false
      else void refresh()
    }, [refresh]),
  )

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.lg }]}>
      <View style={[styles.padded, styles.header]}>
        <AppText variant="h2" accessibilityRole="header" style={styles.title}>
          {copy.libraryScreen.title}
        </AppText>
        <IconButton icon={Search} label="Search" color="text" onPress={openSearch} />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityLabel={copy.libraryScreen.title}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chips}
      >
        <Chip label={copy.libraryScreen.chips.playlists} onPress={openPlaylists} />
        {CHIPS.map((chip) => (
          <Chip
            key={chip.filter}
            label={chip.label}
            selected={filter === chip.filter}
            onPress={() => setFilter(filter === chip.filter ? null : chip.filter)}
          />
        ))}
      </ScrollView>
      {state.status === "loading" && (
        <View style={[styles.padded, styles.skeleton]}>
          {Array.from({ length: SKELETON_ROWS }, (_, index) => (
            <Skeleton key={index} height={sizes.trackRowHeight} />
          ))}
        </View>
      )}
      {state.status === "error" && <ErrorState error={state.error} onRetry={() => void reload()} />}
      {state.status === "ready" && (
        <FlatList
          data={buildItems(filter, state.data, ownPlaylists)}
          keyExtractor={(item) => item.key}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              icon={Library}
              title={copy.libraryScreen.emptyTitle}
              description={copy.libraryScreen.emptyDescription}
            />
          }
          renderItem={({ item }) => {
            switch (item.kind) {
              case "playlist":
                return <PlaylistRow playlist={item.playlist} />
              case "album":
                return <AlbumRow album={item.album} />
              case "artist":
                return <ArtistRow artist={item.artist} />
              case "track":
                return (
                  <TrackRow
                    track={item.track}
                    index={item.index}
                    list={state.data.tracks}
                    source={SOURCE}
                    trailing="like"
                  />
                )
            }
          }}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  padded: { paddingHorizontal: spacing.screen },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { flex: 1 },
  chipsScroll: { flexGrow: 0, marginTop: spacing.lg, marginBottom: spacing.lg },
  chips: { paddingHorizontal: spacing.screen, gap: spacing.sm },
  skeleton: { gap: spacing.md },
  list: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xxxl },
})
