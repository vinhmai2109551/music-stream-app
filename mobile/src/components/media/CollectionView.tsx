import { router } from "expo-router"
import { Heart, Music, Shuffle } from "lucide-react-native"
import { useEffect, useRef } from "react"
import { FlatList, View } from "react-native"
import { getAlbum } from "@/api/albums"
import { getPlaylist } from "@/api/playlists"
import type { ApiAlbumDetail, ApiPlaylistDetail } from "@/api/types"
import { AppText } from "@/components/ui/AppText"
import { CoverImage } from "@/components/ui/CoverImage"
import { EmptyState } from "@/components/ui/EmptyState"
import { ErrorState } from "@/components/ui/ErrorState"
import { IconButton } from "@/components/ui/IconButton"
import { PlayButton } from "@/components/ui/PlayButton"
import { Skeleton } from "@/components/ui/Skeleton"
import { TopBar } from "@/components/ui/TopBar"
import { useResource } from "@/hooks/useResource"
import { useLibraryStore } from "@/store/libraryStore"
import { usePlayerStore } from "@/store/playerStore"
import { showToast } from "@/store/toastStore"
import { makeStyles, radius, shadows, sizes, spacing } from "@/theme"
import type { ImageSource, Track } from "@/types"
import { formatNumber } from "@/utils/formatCount"
import { formatTime } from "@/utils/formatTime"
import { PlaylistOwnerControls } from "./PlaylistOwnerControls"
import { TrackRow } from "./TrackRow"
import { useTranslation } from "@/i18n"

type Collection = {
  name: string
  cover: ImageSource
  description: string
  /** Set for albums: their description is made from it when shown (it follows the language). */
  albumArtist: string | null
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
    cover: playlist.cover ?? "",
    description: playlist.description,
    albumArtist: null,
    tracks: playlist.tracks,
    byline: formatTime(totalDuration(playlist.tracks)),
    otherLikes: playlist.likesCount - (playlist.liked ? 1 : 0),
  }
}

function fromAlbum(album: ApiAlbumDetail): Collection {
  return {
    name: album.title,
    cover: album.cover,
    description: "",
    albumArtist: album.artist,
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
  const { t } = useTranslation()

  const styles = useStyles()

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
  // Only playlists the user made are listed in `playlists`: official and other people's are not.
  const mine = useLibraryStore(
    (library) => kind === "playlist" && library.playlists.some((playlist) => playlist.id === id),
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
      showToast(t("collection.addSongsFirst"))
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
      : `${t("common.count.likes", { count: likeCount, value: formatNumber(likeCount) })} · ${collection.byline}`

  const header = (
    <View>
      <View style={styles.hero}>
        <CoverImage
          source={collection.cover}
          youtubeVideoId={collection.tracks[0]?.youtubeVideoId}
          label={collection.name}
          style={styles.cover}
        />
        <AppText variant="h2" numberOfLines={2} style={styles.center}>
          {collection.name}
        </AppText>
        <AppText variant="caption" color="secondary" style={styles.center}>
          {subtitle}
        </AppText>
        <AppText variant="body" color="secondary" numberOfLines={3} style={styles.center}>
          {collection.albumArtist === null
            ? collection.description
            : t("collection.albumBy", { artist: collection.albumArtist })}
        </AppText>
      </View>
      <View style={styles.controls}>
        <IconButton
          icon={Heart}
          label={kind === "playlist" ? t("collection.likePlaylist") : t("collection.saveAlbum")}
          active={liked}
          activeColor="like"
          onPress={onToggleLike}
        />
        {mine ? <PlaylistOwnerControls playlistId={id} name={collection.name} /> : null}
        <View style={styles.spacer} />
        <IconButton
          icon={Shuffle}
          label={t("common.shuffle")}
          active={shuffle}
          onPress={toggleShuffle}
        />
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
            title={t("collection.noSongsTitle")}
            description={t("collection.noSongsDescription")}
          />
        }
        renderItem={({ item, index }) => (
          <TrackRow
            track={item}
            index={index}
            list={collection.tracks}
            source={collection.name}
            numbered
            playlistId={mine ? id : undefined}
          />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  )
}

function CollectionSkeleton() {
  const styles = useStyles()

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

const useStyles = makeStyles((colors) => ({
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
}))
