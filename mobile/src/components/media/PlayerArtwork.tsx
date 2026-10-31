import { StyleSheet, View } from "react-native"
import { CoverImage } from "@/components/ui/CoverImage"
import { radius, shadows, sizes } from "@/theme"
import type { ImageSource } from "@/types"

type PlayerArtworkProps = {
  source: ImageSource
  /** Picture to use when `source` cannot be loaded. */
  youtubeVideoId?: string | null
}

/** Square cover that fills the available width. */
export function PlayerArtwork({ source, youtubeVideoId }: PlayerArtworkProps) {
  return (
    <View style={styles.wrapper}>
      <CoverImage source={source} youtubeVideoId={youtubeVideoId} style={styles.image} />
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    maxWidth: sizes.playerArtworkMax,
    maxHeight: "100%",
    aspectRatio: 1,
    alignSelf: "center",
    ...shadows.card,
  },
  image: { width: "100%", height: "100%", borderRadius: radius.card },
})
