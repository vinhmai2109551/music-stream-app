import { Image } from "expo-image"
import { router } from "expo-router"
import { Heart, Music, Shuffle } from "lucide-react-native"
import { useMemo } from "react"
import { FlatList, StyleSheet, View } from "react-native"
import { AppText } from "@/components/ui/AppText"
import { EmptyState } from "@/components/ui/EmptyState"
import { IconButton } from "@/components/ui/IconButton"
import { PlayButton } from "@/components/ui/PlayButton"
import { Skeleton } from "@/components/ui/Skeleton"
import { TopBar } from "@/components/ui/TopBar"
import { getAlbum, getTracks } from "@/data/mock"
import { useSimulatedLoading } from "@/hooks/useSimulatedLoading"
import { useToast } from "@/hooks/useToast"
import { useLibraryStore } from "@/store/libraryStore"
import { usePlayerStore } from "@/store/playerStore"
import { colors, radius, shadows, sizes, spacing } from "@/theme"
import type { ImageSource, Track } from "@/types"
import { formatNumber } from "@/utils/formatCount"
import { formatTime } from "@/utils/formatTime"
import { TrackRow } from "./TrackRow"

type Collection = {
  id: string
  name: string
  cover: ImageSource
  description: string
  subtitle: string
  tracks: Track[]
}

type CollectionViewProps = {
  kind: "playlist" | "album"
  id: string
}

/** Playlist and album details share one layout; the id decides which data is shown. */
export function CollectionView({ kind, id }: CollectionViewProps) {
  const loading = useSimulatedLoading()
  const playlists = useLibraryStore((state) => state.playlists)
  const liked = useLibraryStore((state) =>
    kind === "playlist" ? state.likedPlaylistIds.includes(id) : state.likedAlbumIds.includes(id),
  )
  const togglePlaylistLike = useLibraryStore((state) => state.togglePlaylistLike)
  const toggleAlbumLike = useLibraryStore((state) => state.toggleAlbumLike)
  const shuffle = usePlayerStore((state) => state.shuffle)
  const toggleShuffle = usePlayerStore((state) => state.toggleShuffle)
  const playFromList = usePlayerStore((state) => state.playFromList)
  const togglePlaying = usePlayerStore((state) => state.togglePlaying)
  const { show, toast } = useToast()

  const collection = useMemo<Collection | null>(() => {
    if (kind === "playlist") {
      const playlist = playlists.find((item) => item.id === id)
      if (!playlist) return null
      const tracks = getTracks(playlist.trackIds)
      return {
        id: playlist.id,
        name: playlist.name,
        cover: playlist.cover,
        description: playlist.description,
        subtitle: `${formatNumber(playlist.likes)} likes · ${formatTime(totalDuration(tracks))}`,
        tracks,
      }
    }
    const album = getAlbum(id)
    if (!album) return null
    const tracks = getTracks(album.trackIds)
    return {
      id: album.id,
      name: album.title,
      cover: album.cover,
      description: `An album by ${album.artist}.`,
      subtitle: `${album.artist} · ${formatTime(totalDuration(tracks))}`,
      tracks,
    }
  }, [kind, id, playlists])

  const playingFromHere = usePlayerStore(
    (state) => state.isPlaying && collection !== null && state.queueSource === collection.name,
  )

  if (loading) return <CollectionSkeleton />
  if (!collection) {
    return (
      <View style={styles.screen}>
        <TopBar />
        <EmptyState
          icon={Music}
          title="Not found"
          description="This collection is no longer available."
        />
      </View>
    )
  }

  const onPlay = () => {
    if (playingFromHere) {
      togglePlaying()
      return
    }
    if (collection.tracks.length === 0) {
      show("Add some songs first")
      return
    }
    playFromList(collection.tracks, 0, collection.name)
    router.push("/player")
  }

  const onToggleLike = () => (kind === "playlist" ? togglePlaylistLike(id) : toggleAlbumLike(id))

  const header = (
    <View>
      <View style={styles.hero}>
        <Image source={collection.cover} contentFit="cover" style={styles.cover} />
        <AppText variant="h2" numberOfLines={2} style={styles.center}>
          {collection.name}
        </AppText>
        <AppText variant="caption" color="secondary" style={styles.center}>
          {collection.subtitle}
        </AppText>
        <AppText variant="body" color="secondary" numberOfLines={3} style={styles.center}>
          {collection.description}
        </AppText>
      </View>
      <View style={styles.controls}>
        <IconButton
          icon={Heart}
          label={kind === "playlist" ? "Like playlist" : "Save album"}
          active={liked}
          activeColor="like"
          onPress={onToggleLike}
        />
        <View style={styles.spacer} />
        <IconButton icon={Shuffle} label="Shuffle" active={shuffle} onPress={toggleShuffle} />
        <PlayButton playing={playingFromHere} onPress={onPlay} />
      </View>
    </View>
  )

  return (
    <View style={styles.screen}>
      <TopBar title={collection.name} />
      <FlatList
        data={collection.tracks}
        keyExtractor={(track) => track.id}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <EmptyState
            icon={Music}
            title="No songs yet"
            description="Add tracks from the “…” menu on any song."
          />
        }
        renderItem={({ item, index }) => (
          <TrackRow
            track={item}
            index={index}
            list={collection.tracks}
            source={collection.name}
            numbered
            onNotify={show}
          />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
      {toast}
    </View>
  )
}

const totalDuration = (tracks: Track[]) => tracks.reduce((sum, track) => sum + track.duration, 0)

function CollectionSkeleton() {
  return (
    <View style={styles.screen}>
      <TopBar />
      <View style={styles.skeleton}>
        <Skeleton
          width={sizes.collectionCover}
          height={sizes.collectionCover}
          rounded={radius.card}
        />
        <Skeleton width={200} height={sizes.topBarHeight / 2} />
        <Skeleton height={sizes.trackRowHeight} />
        <Skeleton height={sizes.trackRowHeight} />
        <Skeleton height={sizes.trackRowHeight} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  list: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xxxl },
  hero: { alignItems: "center", gap: spacing.sm },
  cover: {
    width: sizes.collectionCover,
    height: sizes.collectionCover,
    borderRadius: radius.card,
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  center: { textAlign: "center" },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginVertical: spacing.xl,
  },
  spacer: { flex: 1 },
  skeleton: { alignItems: "center", gap: spacing.lg, paddingHorizontal: spacing.screen },
})
