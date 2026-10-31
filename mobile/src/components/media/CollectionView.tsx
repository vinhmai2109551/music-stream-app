import { Image } from "expo-image"
import { router } from "expo-router"
import { Heart, Music, Shuffle } from "lucide-react-native"
import { useEffect, useRef } from "react"
import { FlatList, StyleSheet, View } from "react-native"
import { getAlbum } from "@/api/albums"
import { getPlaylist } from "@/api/playlists"
import type { ApiAlbumDetail, ApiPlaylistDetail } from "@/api/types"
import { AppText } from "@/components/ui/AppText"
import { EmptyState } from "@/components/ui/EmptyState"
import { ErrorState } from "@/components/ui/ErrorState"
import { IconButton } from "@/components/ui/IconButton"
import { PlayButton } from "@/components/ui/PlayButton"
import { Skeleton } from "@/components/ui/Skeleton"
import { TopBar } from "@/components/ui/TopBar"
import { images } from "@/data/images"
import { useResource } from "@/hooks/useResource"
import { useLibraryStore } from "@/store/libraryStore"
import { usePlayerStore } from "@/store/playerStore"
import { showToast } from "@/store/toastStore"
import { colors, radius, shadows, sizes, spacing } from "@/theme"
import type { ImageSource, Track } from "@/types"
import { formatNumber } from "@/utils/formatCount"
import { formatTime } from "@/utils/formatTime"
import { plural } from "@/utils/plural"
import { TrackRow } from "./TrackRow"

const NOTHING_TO_PLAY = "Add some songs first"

type Collection = {
  name: string
  cover: ImageSource
  description: string
  tracks: Track[]
  /** Second line under the name, without the like count (it changes when the user likes). */
  byline: string
  /** Likes from other people; the user's own like is added on top. Null for albums. */
  otherLikes: number | null
}

const totalDuration = (tracks: Track[]) => tracks.reduce((sum, track) => sum + track.duration, 0)

function fromPlaylist(playlist: ApiPlaylistDetail): Collection {
  return {
    name: playlist.name,
    cover: playlist.cover ?? images.playlists.fallback,
    description: playlist.description,
    tracks: playlist.tracks,
    byline: formatTime(totalDuration(playlist.tracks)),
    otherLikes: playlist.likesCount - (playlist.liked ? 1 : 0),
  }
}

function fromAlbum(album: ApiAlbumDetail): Collection {
  return {
    name: album.title,
    cover: album.cover,
    description: `An album by ${album.artist}.`,
    tracks: album.tracks,
    byline: `${album.artist} · ${formatTime(totalDuration(album.tracks))}`,
    otherLikes: null,
  }
}

type CollectionViewProps = {
  kind: "playlist" | "album"
  id: string
}

/** Playlist and album details share one layout; the id decides which data is loaded. */
export function CollectionView({ kind, id }: CollectionViewProps) {
  const { state, reload, refresh } = useResource<Collection>(
    async () =>
      kind === "playlist" ? fromPlaylist(await getPlaylist(id)) : fromAlbum(await getAlbum(id)),
    `${kind}:${id}`,
  )

  // A track added to a playlist from anywhere (e.g. the menu of a row) must show up here too.
  const revision = useLibraryStore((library) => library.playlistRevision)
  const seenRevision = useRef(revision)
  useEffect(() => {
    if (seenRevision.current === revision) return
    seenRevision.current = revision
    if (kind === "playlist") void refresh()
  }, [revision, kind, refresh])

  const liked = useLibraryStore((library) =>
    kind === "playlist"
      ? library.likedPlaylistIds.includes(id)
      : library.likedAlbumIds.includes(id),
  )
  const togglePlaylistLike = useLibraryStore((library) => library.togglePlaylistLike)
  const toggleAlbumLike = useLibraryStore((library) => library.toggleAlbumLike)
  const shuffle = usePlayerStore((player) => player.shuffle)
  const toggleShuffle = usePlayerStore((player) => player.toggleShuffle)
  const playFromList = usePlayerStore((player) => player.playFromList)
  const togglePlaying = usePlayerStore((player) => player.togglePlaying)
  const collectionName = state.status === "ready" ? state.data.name : null
  const playingFromHere = usePlayerStore(
    (player) =>
      player.isPlaying && collectionName !== null && player.queueSource === collectionName,
  )

  if (state.status === "loading") return <CollectionSkeleton />
  if (state.status === "error") {
    return (
      <View style={styles.screen}>
        <TopBar />
        <ErrorState error={state.error} onRetry={() => void reload()} />
      </View>
    )
  }

  const collection = state.data

  const onPlay = () => {
    if (playingFromHere) {
      togglePlaying()
      return
    }
    if (collection.tracks.length === 0) {
      showToast(NOTHING_TO_PLAY)
      return
    }
    playFromList(collection.tracks, 0, collection.name)
    router.push("/player")
  }

  const onToggleLike = () =>
    void (kind === "playlist" ? togglePlaylistLike(id) : toggleAlbumLike(id))

  const likeCount = collection.otherLikes === null ? 0 : collection.otherLikes + (liked ? 1 : 0)
  const subtitle =
    collection.otherLikes === null
      ? collection.byline
      : `${formatNumber(likeCount)} ${plural("like", likeCount)} · ${collection.byline}`

  const header = (
    <View>
      <View style={styles.hero}>
        <Image source={collection.cover} contentFit="cover" style={styles.cover} />
        <AppText variant="h2" numberOfLines={2} style={styles.center}>
          {collection.name}
        </AppText>
        <AppText variant="caption" color="secondary" style={styles.center}>
          {subtitle}
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
      <TopBar />
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
          />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  )
}

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
