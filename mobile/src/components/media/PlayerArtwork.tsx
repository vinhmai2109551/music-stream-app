import { Image } from "expo-image"
import { StyleSheet, View } from "react-native"
import { radius, shadows, sizes } from "@/theme"
import type { ImageSource } from "@/types"

type PlayerArtworkProps = {
  source: ImageSource
}

/** Square cover that fills the available width. */
export function PlayerArtwork({ source }: PlayerArtworkProps) {
  return (
    <View style={styles.wrapper}>
      <Image source={source} contentFit="cover" style={styles.image} />
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
