import { router } from "expo-router"
import { StyleSheet, View } from "react-native"
import type { ApiTrack, Region } from "@/api/types"
import { HorizontalList } from "@/components/ui/HorizontalList"
import { SectionHeader } from "@/components/ui/SectionHeader"
import { useBecauseYouListened, useForYou } from "@/hooks/useRecommendations"
import { usePlayerStore } from "@/store/playerStore"
import { spacing } from "@/theme"
import type { Suggestion } from "@/types"
import { toSuggestion } from "@/utils/homeMappers"
import { SuggestionCard } from "./SuggestionCard"
import { useTranslation } from "@/i18n"

type RecommendationSectionsProps = {
  region: Region | null
}

/**
 * "Dành cho bạn" and "Vì bạn đã nghe …" on Home. They are extras: while they load, and when they
 * are empty or cannot be loaded (the AI features are off), nothing is shown, so Home does not
 * jump when they turn out to be missing.
 */
export function RecommendationSections({ region }: RecommendationSectionsProps) {
  const { t } = useTranslation()

  const forYou = useForYou(region)
  const because = useBecauseYouListened(region)

  return (
    <>
      {forYou.status === "ready" && (
        <TrackSection
          title={t("recommendations.forYou")}
          tracks={forYou.items}
          source={t("recommendations.forYouSource")}
        />
      )}
      {because.status === "ready" && (
        <TrackSection
          title={`${t("recommendations.becauseYouListened")} ${because.items[0].basedOn.title}`}
          tracks={because.items[0].tracks}
          source={t("recommendations.becauseYouListened")}
        />
      )}
    </>
  )
}

type TrackSectionProps = {
  title: string
  tracks: ApiTrack[]
  source: string
}

function TrackSection({ title, tracks, source }: TrackSectionProps) {
  const playFromList = usePlayerStore((state) => state.playFromList)

  const play = (suggestion: Suggestion) => {
    const index = tracks.findIndex((track) => track.id === suggestion.trackId)
    if (index < 0) return
    playFromList(tracks, index, source)
    router.push("/player")
  }

  return (
    <View style={styles.section}>
      <View style={styles.padded}>
        <SectionHeader title={title} />
      </View>
      <HorizontalList
        data={tracks.map(toSuggestion)}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <SuggestionCard suggestion={item} onPress={play} />}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  padded: { paddingHorizontal: spacing.screen },
  section: { marginTop: spacing.xxl },
})
