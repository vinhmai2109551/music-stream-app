import { useState } from "react"
import { FlatList, StyleSheet, View } from "react-native"
import { BottomSheet } from "@/components/ui/BottomSheet"
import { Button } from "@/components/ui/Button"
import { useSimilarTracks } from "@/hooks/useRecommendations"
import { spacing } from "@/theme"
import { TrackRow } from "./TrackRow"
import { useTranslation } from "@/i18n"

const SHEET_HEIGHT = "70%"

type SimilarTracksProps = {
  /** The track that is playing. */
  trackId: string
}

/**
 * A button under the player actions that opens the tracks like the current one. It is an extra:
 * with nothing to show, or when the AI features are off, there is no button at all.
 */
export function SimilarTracks({ trackId }: SimilarTracksProps) {
  const { t } = useTranslation()

  const similar = useSimilarTracks(trackId)
  // Remembers which track the sheet was opened for, so it closes by itself when the track changes.
  const [openFor, setOpenFor] = useState<string | null>(null)

  if (similar.status !== "ready") return null
  const tracks = similar.items

  return (
    <View style={styles.container}>
      <Button
        label={t("recommendations.similarOpen")}
        variant="glass"
        compact
        onPress={() => setOpenFor(trackId)}
      />
      <BottomSheet
        visible={openFor === trackId}
        onClose={() => setOpenFor(null)}
        title={t("recommendations.similarTitle")}
        height={SHEET_HEIGHT}
      >
        <FlatList
          data={tracks}
          keyExtractor={(track) => track.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <TrackRow
              track={item}
              index={index}
              list={tracks}
              source={t("recommendations.similarSource")}
            />
          )}
        />
      </BottomSheet>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { alignItems: "center", marginTop: spacing.md },
})
