import { router } from "expo-router"
import { Music } from "lucide-react-native"
import type { ReactNode } from "react"
import { StyleSheet, View } from "react-native"
import { EmptyState } from "@/components/ui/EmptyState"
import { HorizontalList } from "@/components/ui/HorizontalList"
import { SectionHeader } from "@/components/ui/SectionHeader"
import { copy } from "@/constants/copy"
import type { HomeData } from "@/hooks/useHomeData"
import { usePlayerStore } from "@/store/playerStore"
import { showToast } from "@/store/toastStore"
import { spacing } from "@/theme"
import type { Suggestion } from "@/types"
import { toChartItem, toSuggestion } from "@/utils/homeMappers"
import { AlbumCard } from "./AlbumCard"
import { ArtistAvatar } from "./ArtistAvatar"
import { ChartCard } from "./ChartCard"
import { PremiumBanner } from "./PremiumBanner"
import { SuggestionCard } from "./SuggestionCard"

const COMING_SOON = "Coming soon"
const SUGGESTION_SOURCE = "Suggestions for you"

const openPlaylist = (id: string) => router.push({ pathname: "/playlist/[id]", params: { id } })
const openAlbum = (id: string) => router.push({ pathname: "/album/[id]", params: { id } })
const openArtist = (id: string) => router.push({ pathname: "/artist/[id]", params: { id } })
const openSearch = () => router.navigate("/search")

type HomeContentProps = {
  data: HomeData
}

/** The sections of the Home screen, below the header and the search field. */
export function HomeContent({ data }: HomeContentProps) {
  const playFromList = usePlayerStore((state) => state.playFromList)

  const isEmpty =
    data.suggestions.length === 0 &&
    data.charts.length === 0 &&
    data.albums.length === 0 &&
    data.artists.length === 0
  if (isEmpty) {
    return (
      <EmptyState
        icon={Music}
        title={copy.home.emptyTitle}
        description={copy.home.emptyDescription}
      />
    )
  }

  const playSuggestion = (suggestion: Suggestion) => {
    const index = data.suggestions.findIndex((track) => track.id === suggestion.trackId)
    if (index < 0) return
    playFromList(data.suggestions, index, SUGGESTION_SOURCE)
    router.push("/player")
  }

  const firstChart = data.charts[0]

  return (
    <>
      <Section title="Suggestions for you" onAction={openSearch}>
        <HorizontalList
          data={data.suggestions.map(toSuggestion)}
          keyExtractor={(item) => item.id}
          emptyMessage="No songs yet"
          renderItem={({ item }) => <SuggestionCard suggestion={item} onPress={playSuggestion} />}
        />
      </Section>

      <Section title="Charts" onAction={firstChart ? () => openPlaylist(firstChart.id) : undefined}>
        <HorizontalList
          data={data.charts.map(toChartItem)}
          keyExtractor={(item) => item.id}
          emptyMessage="No charts yet"
          renderItem={({ item }) => <ChartCard chart={item} onPress={openPlaylist} />}
        />
      </Section>

      <Section title="Trending albums">
        <HorizontalList
          data={data.albums}
          keyExtractor={(item) => item.id}
          emptyMessage="No albums yet"
          renderItem={({ item }) => <AlbumCard album={item} onPress={openAlbum} />}
        />
      </Section>

      <Section title="Popular artists">
        <HorizontalList
          data={data.artists}
          keyExtractor={(item) => item.id}
          emptyMessage="No artists yet"
          renderItem={({ item }) => <ArtistAvatar artist={item} onPress={openArtist} />}
        />
      </Section>

      <View style={[styles.padded, styles.banner]}>
        <PremiumBanner onPress={() => showToast(COMING_SOON)} />
      </View>
    </>
  )
}

type SectionProps = {
  title: string
  onAction?: () => void
  children: ReactNode
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
  padded: { paddingHorizontal: spacing.screen },
  section: { marginTop: spacing.xxl },
  banner: { marginTop: spacing.xxxl },
})
