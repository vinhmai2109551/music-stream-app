import { useState } from "react"
import { FlatList, StyleSheet, View } from "react-native"
import type { ApiAlbum, ApiArtist, ApiTrack } from "@/api/types"
import { EmptyState } from "@/components/ui/EmptyState"
import { ErrorState } from "@/components/ui/ErrorState"
import { Skeleton } from "@/components/ui/Skeleton"
import { UnderlineTabs, type TabItem } from "@/components/ui/UnderlineTabs"
import { copy } from "@/constants/copy"
import { useSearchResults, type SearchResults as Results } from "@/hooks/useSearch"
import { sizes, spacing } from "@/theme"
import { AlbumRow } from "./AlbumRow"
import { ArtistRow } from "./ArtistRow"
import { TrackRow } from "./TrackRow"

type Tab = "all" | "tracks" | "albums" | "artists"

const TABS: readonly TabItem<Tab>[] = [
  { key: "all", label: copy.search.tabs.all },
  { key: "tracks", label: copy.search.tabs.tracks },
  { key: "albums", label: copy.search.tabs.albums },
  { key: "artists", label: copy.search.tabs.artists },
]

/** "All" shows the best artist first, then songs, then a few albums. */
const ALL_TRACKS = 8
const ALL_ALBUMS = 3
const SKELETON_ROWS = 5
const SOURCE = "Search results"

type Item =
  | { key: string; kind: "artist"; artist: ApiArtist }
  | { key: string; kind: "track"; track: ApiTrack; index: number }
  | { key: string; kind: "album"; album: ApiAlbum }

const artistItems = (artists: ApiArtist[]): Item[] =>
  artists.map((artist) => ({ key: `artist:${artist.id}`, kind: "artist", artist }))
const trackItems = (tracks: ApiTrack[]): Item[] =>
  tracks.map((track, index) => ({ key: `track:${track.id}`, kind: "track", track, index }))
const albumItems = (albums: ApiAlbum[]): Item[] =>
  albums.map((album) => ({ key: `album:${album.id}`, kind: "album", album }))

function itemsFor(tab: Tab, results: Results): Item[] {
  switch (tab) {
    case "tracks":
      return trackItems(results.tracks)
    case "albums":
      return albumItems(results.albums)
    case "artists":
      return artistItems(results.artists)
    case "all":
      return [
        ...artistItems(results.artists.slice(0, 1)),
        ...trackItems(results.tracks).slice(0, ALL_TRACKS),
        ...albumItems(results.albums.slice(0, ALL_ALBUMS)),
      ]
  }
}

type SearchResultsProps = {
  /** The search that was submitted. */
  query: string
}

/** Tabs (All, Tracks, Albums, Artists) over the matches of one search. */
export function SearchResults({ query }: SearchResultsProps) {
  const { state, reload } = useSearchResults(query)
  const [tab, setTab] = useState<Tab>("all")

  return (
    <View style={styles.container}>
      <UnderlineTabs tabs={TABS} selected={tab} onSelect={setTab} />
      {state.status === "loading" && (
        <View style={styles.skeleton}>
          {Array.from({ length: SKELETON_ROWS }, (_, index) => (
            <Skeleton key={index} height={sizes.trackRowHeight} />
          ))}
        </View>
      )}
      {state.status === "error" && <ErrorState error={state.error} onRetry={() => void reload()} />}
      {state.status === "ready" && (
        <FlatList
          data={itemsFor(tab, state.data)}
          keyExtractor={(item) => item.key}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              title={copy.search.noResultsTitle}
              description={copy.search.noResultsDescription}
            />
          }
          renderItem={({ item }) => {
            switch (item.kind) {
              case "artist":
                return <ArtistRow artist={item.artist} />
              case "album":
                return <AlbumRow album={item.album} />
              case "track":
                return (
                  <TrackRow
                    track={item.track}
                    index={item.index}
                    list={state.data.tracks}
                    source={SOURCE}
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
  container: { flex: 1 },
  list: { paddingTop: spacing.md, paddingBottom: spacing.xxxl },
  skeleton: { gap: spacing.md, paddingTop: spacing.lg },
})
