import { router } from "expo-router"
import { Search } from "lucide-react-native"
import { Pressable, ScrollView, StyleSheet, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { AlbumCard } from "@/components/media/AlbumCard"
import { ArtistAvatar } from "@/components/media/ArtistAvatar"
import { ChartCard } from "@/components/media/ChartCard"
import { HomeHeader } from "@/components/media/HomeHeader"
import { HomeSkeleton } from "@/components/media/HomeSkeleton"
import { PremiumBanner } from "@/components/media/PremiumBanner"
import { SuggestionCard } from "@/components/media/SuggestionCard"
import { AppText } from "@/components/ui/AppText"
import { HorizontalList } from "@/components/ui/HorizontalList"
import { pressedStyle } from "@/components/ui/pressed"
import { SectionHeader } from "@/components/ui/SectionHeader"
import { copy } from "@/constants/copy"
import { albums, artists, charts, suggestions, tracks } from "@/data/mock"
import { useSimulatedLoading } from "@/hooks/useSimulatedLoading"
import { useToast } from "@/hooks/useToast"
import { useAuthStore } from "@/store/authStore"
import { usePlayerStore } from "@/store/playerStore"
import { colors, radius, sizes, spacing } from "@/theme"
import type { Suggestion } from "@/types"

const COMING_SOON = "Coming soon"
const SUGGESTION_SOURCE = "Suggestions for you"

const openPlaylist = (id: string) => router.push({ pathname: "/playlist/[id]", params: { id } })
const openAlbum = (id: string) => router.push({ pathname: "/album/[id]", params: { id } })
const openArtist = (id: string) => router.push({ pathname: "/artist/[id]", params: { id } })
const openSearch = () => router.navigate("/search")

export default function HomeScreen() {
  const insets = useSafeAreaInsets()
  const loading = useSimulatedLoading()
  const playFromList = usePlayerStore((state) => state.playFromList)
  const { show, toast } = useToast()

  const playSuggestion = (suggestion: Suggestion) => {
    const index = tracks.findIndex((track) => track.id === suggestion.trackId)
    if (index < 0) return
    playFromList(tracks, index, SUGGESTION_SOURCE)
    router.push("/player")
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <HomeSkeleton />
        ) : (
          <>
            <View style={styles.padded}>
              <HomeHeader
                onNotifications={() => show(COMING_SOON)}
                onLogout={() => void useAuthStore.getState().logout()}
              />
              <Pressable
                accessibilityRole="search"
                accessibilityLabel={copy.searchPlaceholder}
                onPress={openSearch}
                style={({ pressed }) => [styles.search, pressedStyle(pressed)]}
              >
                <Search size={sizes.iconMd} color={colors.tertiary} />
                <AppText color="tertiary" numberOfLines={1}>
                  {copy.searchPlaceholder}
                </AppText>
              </Pressable>
            </View>

            <Section title="Suggestions for you" onAction={openSearch}>
              <HorizontalList
                data={suggestions}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <SuggestionCard suggestion={item} onPress={playSuggestion} />
                )}
              />
            </Section>

            <Section title="Charts" onAction={() => openPlaylist(charts[0].id)}>
              <HorizontalList
                data={charts}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <ChartCard chart={item} onPress={openPlaylist} />}
              />
            </Section>

            <Section title="Trending albums">
              <HorizontalList
                data={albums}
                keyExtractor={(item) => item.id}
                emptyMessage="No albums yet"
                renderItem={({ item }) => <AlbumCard album={item} onPress={openAlbum} />}
              />
            </Section>

            <Section title="Popular artists">
              <HorizontalList
                data={artists}
                keyExtractor={(item) => item.id}
                emptyMessage="No artists yet"
                renderItem={({ item }) => <ArtistAvatar artist={item} onPress={openArtist} />}
              />
            </Section>

            <View style={[styles.padded, styles.banner]}>
              <PremiumBanner onPress={() => show(COMING_SOON)} />
            </View>
          </>
        )}
      </ScrollView>
      {toast}
    </View>
  )
}

type SectionProps = {
  title: string
  onAction?: () => void
  children: React.ReactNode
}

function Section({ title, onAction, children }: SectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.padded}>
        <SectionHeader title={title} onAction={onAction} />
      </View>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  padded: { paddingHorizontal: spacing.screen },
  search: {
    height: sizes.searchBarHeight,
    marginTop: spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  section: { marginTop: spacing.xxl },
  banner: { marginTop: spacing.xxxl },
})
