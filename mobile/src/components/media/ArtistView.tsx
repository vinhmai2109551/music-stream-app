import { router } from "expo-router"
import { Shuffle, User } from "lucide-react-native"
import { ScrollView, StyleSheet, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { listAlbums } from "@/api/albums"
import { getArtist, listArtists } from "@/api/artists"
import { listTracks } from "@/api/tracks"
import type { ApiAlbum, ApiArtist, ApiTrack } from "@/api/types"
import { AppText } from "@/components/ui/AppText"
import { CoverImage } from "@/components/ui/CoverImage"
import { Button } from "@/components/ui/Button"
import { ErrorState } from "@/components/ui/ErrorState"
import { HorizontalList } from "@/components/ui/HorizontalList"
import { IconButton } from "@/components/ui/IconButton"
import { PlayButton } from "@/components/ui/PlayButton"
import { SectionHeader } from "@/components/ui/SectionHeader"
import { Skeleton } from "@/components/ui/Skeleton"
import { TopBar } from "@/components/ui/TopBar"
import { useResource } from "@/hooks/useResource"
import { useLibraryStore } from "@/store/libraryStore"
import { usePlayerStore } from "@/store/playerStore"
import { showToast } from "@/store/toastStore"
import { colors, radius, shadows, sizes, spacing } from "@/theme"
import { formatCount } from "@/utils/formatCount"
import { plural } from "@/utils/plural"
import { AlbumCard } from "./AlbumCard"
import { ArtistAbout } from "./ArtistAbout"
import { ArtistAvatar } from "./ArtistAvatar"
import { TrackRow } from "./TrackRow"

const POPULAR_COUNT = 5
const LIST_LIMIT = 10
const NO_SONGS = "No songs yet"

const openAlbum = (id: string) => router.push({ pathname: "/album/[id]", params: { id } })
const openArtist = (id: string) => router.push({ pathname: "/artist/[id]", params: { id } })

interface ArtistPage {
  artist: ApiArtist
  /** The artist's most played tracks. */
  popular: ApiTrack[]
  albums: ApiAlbum[]
  /** Other artists, for "Fans also like". */
  fansAlsoLike: ApiArtist[]
}

async function loadArtistPage(id: string): Promise<ArtistPage> {
  const [artist, tracks, albums, artists] = await Promise.all([
    getArtist(id),
    listTracks({ artistId: id, limit: POPULAR_COUNT }),
    listAlbums({ artistId: id, limit: LIST_LIMIT }),
    listArtists({ limit: LIST_LIMIT }),
  ])
  return {
    artist,
    popular: tracks.items,
    albums: albums.items,
    fansAlsoLike: artists.items.filter((other) => other.id !== id),
  }
}

type ArtistViewProps = {
  id: string
}

export function ArtistView({ id }: ArtistViewProps) {
  const { state, reload } = useResource(() => loadArtistPage(id), id)
  const followed = useLibraryStore((library) => library.followedArtistIds.includes(id))
  const toggleFollow = useLibraryStore((library) => library.toggleFollow)
  const shuffle = usePlayerStore((player) => player.shuffle)
  const toggleShuffle = usePlayerStore((player) => player.toggleShuffle)
  const playFromList = usePlayerStore((player) => player.playFromList)

  if (state.status === "loading") return <ArtistSkeleton />
  if (state.status === "error") {
    return (
      <View style={styles.screen}>
        <TopBar />
        <ErrorState error={state.error} onRetry={() => void reload()} />
      </View>
    )
  }

  return (
    <ArtistContent
      page={state.data}
      followed={followed}
      shuffle={shuffle}
      onToggleFollow={() => void toggleFollow(id)}
      onToggleShuffle={toggleShuffle}
      onPlay={(tracks, source) => {
        if (tracks.length === 0) return showToast(NO_SONGS)
        playFromList(tracks, 0, source)
        router.push("/player")
      }}
    />
  )
}

type ArtistContentProps = {
  page: ArtistPage
  followed: boolean
  shuffle: boolean
  onToggleFollow: () => void
  onToggleShuffle: () => void
  onPlay: (tracks: ApiTrack[], source: string) => void
}

function ArtistContent({
  page,
  followed,
  shuffle,
  onToggleFollow,
  onToggleShuffle,
  onPlay,
}: ArtistContentProps) {
  const insets = useSafeAreaInsets()
  const { artist, popular, albums, fansAlsoLike } = page
  // The count from the server includes the user's follow as it was when the page loaded.
  const followers = artist.followers - (artist.followed ? 1 : 0) + (followed ? 1 : 0)

  return (
    <View style={styles.screen}>
      <TopBar />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxxl }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.padded}>
          <View style={styles.hero}>
            <CoverImage
              source={artist.image}
              label={artist.name}
              icon={User}
              style={styles.image}
            />
            <AppText variant="h2" numberOfLines={2} style={styles.center}>
              {artist.name}
            </AppText>
            <AppText variant="caption" color="secondary">
              {formatCount(followers)} {plural("follower", followers)}
            </AppText>
          </View>
          <View style={styles.controls}>
            <Button
              label={followed ? "Following" : "Follow"}
              variant={followed ? "tonal" : "primary"}
              onPress={onToggleFollow}
            />
            <View style={styles.spacer} />
            <IconButton icon={Shuffle} label="Shuffle" active={shuffle} onPress={onToggleShuffle} />
            <PlayButton onPress={() => onPlay(popular, artist.name)} />
          </View>

          <View style={styles.section}>
            <SectionHeader title="Popular" />
            {popular.length === 0 ? (
              <AppText variant="caption" color="secondary">
                {NO_SONGS}
              </AppText>
            ) : (
              popular.map((track, index) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  index={index}
                  list={popular}
                  source={artist.name}
                  numbered
                />
              ))
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.padded}>
            <SectionHeader title="Albums" />
          </View>
          <HorizontalList<ApiAlbum>
            data={albums}
            keyExtractor={(album) => album.id}
            emptyMessage="No albums yet"
            renderItem={({ item }) => <AlbumCard album={item} onPress={openAlbum} />}
          />
        </View>

        <View style={[styles.section, styles.padded]}>
          <SectionHeader title="About" />
          <ArtistAbout bio={artist.bio} />
        </View>

        <View style={styles.section}>
          <View style={styles.padded}>
            <SectionHeader title="Fans also like" />
          </View>
          <HorizontalList
            data={fansAlsoLike}
            keyExtractor={(item) => item.id}
            emptyMessage="No other artists yet"
            renderItem={({ item }) => <ArtistAvatar artist={item} onPress={openArtist} />}
          />
        </View>
      </ScrollView>
    </View>
  )
}

function ArtistSkeleton() {
  return (
    <View style={styles.screen}>
      <TopBar />
      <View style={styles.skeleton}>
        <Skeleton
          width={sizes.collectionCover}
          height={sizes.collectionCover}
          rounded={radius.pill}
        />
        <Skeleton width={200} height={sizes.topBarHeight / 2} />
        <Skeleton height={sizes.trackRowHeight} />
        <Skeleton height={sizes.trackRowHeight} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  padded: { paddingHorizontal: spacing.screen },
  hero: { alignItems: "center", gap: spacing.xs },
  image: {
    width: sizes.collectionCover,
    height: sizes.collectionCover,
    borderRadius: radius.pill,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  center: { textAlign: "center" },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  spacer: { flex: 1 },
  section: { marginTop: spacing.xxl },
  skeleton: { alignItems: "center", gap: spacing.lg, paddingHorizontal: spacing.screen },
})
