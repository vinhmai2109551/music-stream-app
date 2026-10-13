import { Image } from "expo-image"
import { router } from "expo-router"
import { Mic2, Shuffle } from "lucide-react-native"
import { useMemo } from "react"
import { ScrollView, StyleSheet, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { AppText } from "@/components/ui/AppText"
import { Button } from "@/components/ui/Button"
import { EmptyState } from "@/components/ui/EmptyState"
import { HorizontalList } from "@/components/ui/HorizontalList"
import { IconButton } from "@/components/ui/IconButton"
import { PlayButton } from "@/components/ui/PlayButton"
import { SectionHeader } from "@/components/ui/SectionHeader"
import { Skeleton } from "@/components/ui/Skeleton"
import { TopBar } from "@/components/ui/TopBar"
import { artists, getAlbum, getArtist, getTracks } from "@/data/mock"
import { useSimulatedLoading } from "@/hooks/useSimulatedLoading"
import { useToast } from "@/hooks/useToast"
import { useLibraryStore } from "@/store/libraryStore"
import { usePlayerStore } from "@/store/playerStore"
import { colors, radius, shadows, sizes, spacing } from "@/theme"
import type { Album } from "@/types"
import { formatCount } from "@/utils/formatCount"
import { AlbumCard } from "./AlbumCard"
import { ArtistAbout } from "./ArtistAbout"
import { ArtistAvatar } from "./ArtistAvatar"
import { TrackRow } from "./TrackRow"

const POPULAR_COUNT = 5

const openAlbum = (id: string) => router.push({ pathname: "/album/[id]", params: { id } })
const openArtist = (id: string) => router.push({ pathname: "/artist/[id]", params: { id } })

type ArtistViewProps = {
  id: string
}

export function ArtistView({ id }: ArtistViewProps) {
  const insets = useSafeAreaInsets()
  const loading = useSimulatedLoading()
  const artist = getArtist(id)
  const followed = useLibraryStore((state) => state.followedArtistIds.includes(id))
  const toggleFollow = useLibraryStore((state) => state.toggleFollow)
  const shuffle = usePlayerStore((state) => state.shuffle)
  const toggleShuffle = usePlayerStore((state) => state.toggleShuffle)
  const playFromList = usePlayerStore((state) => state.playFromList)
  const { show, toast } = useToast()

  const popular = useMemo(
    () => (artist ? getTracks(artist.trackIds).slice(0, POPULAR_COUNT) : []),
    [artist],
  )
  const artistAlbums = useMemo(
    () =>
      (artist?.albumIds ?? []).flatMap((albumId) => {
        const album = getAlbum(albumId)
        return album ? [album] : []
      }),
    [artist],
  )
  const fansAlsoLike = useMemo(() => artists.filter((item) => item.id !== id), [id])

  if (loading) return <ArtistSkeleton />
  if (!artist) {
    return (
      <View style={styles.screen}>
        <TopBar />
        <EmptyState icon={Mic2} title="Not found" description="This artist is not available." />
      </View>
    )
  }

  const playAll = () => {
    if (popular.length === 0) return show("No songs yet")
    playFromList(popular, 0, artist.name)
    router.push("/player")
  }

  return (
    <View style={styles.screen}>
      <TopBar />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxxl }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.padded}>
          <View style={styles.hero}>
            <Image source={artist.image} contentFit="cover" style={styles.image} />
            <AppText variant="h2" numberOfLines={2} style={styles.center}>
              {artist.name}
            </AppText>
            <AppText variant="caption" color="secondary">
              {formatCount(artist.followers)} Followers
            </AppText>
          </View>
          <View style={styles.controls}>
            <Button
              label={followed ? "Following" : "Follow"}
              variant={followed ? "secondary" : "primary"}
              onPress={() => toggleFollow(artist.id)}
            />
            <View style={styles.spacer} />
            <IconButton icon={Shuffle} label="Shuffle" active={shuffle} onPress={toggleShuffle} />
            <PlayButton onPress={playAll} />
          </View>

          <View style={styles.section}>
            <SectionHeader title="Popular" />
            {popular.length === 0 ? (
              <AppText variant="caption" color="secondary">
                No songs yet
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
                  onNotify={show}
                />
              ))
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.padded}>
            <SectionHeader title="Albums" />
          </View>
          <HorizontalList<Album>
            data={artistAlbums}
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
            renderItem={({ item }) => <ArtistAvatar artist={item} onPress={openArtist} />}
          />
        </View>
      </ScrollView>
      {toast}
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
