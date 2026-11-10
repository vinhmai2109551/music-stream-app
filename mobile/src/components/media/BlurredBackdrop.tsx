import { StyleSheet, View } from "react-native"
import { CoverImage } from "@/components/ui/CoverImage"
import { colors } from "@/theme"
import type { ImageSource } from "@/types"

const BLUR_RADIUS = 60

type BlurredBackdropProps = {
  source: ImageSource
  /** Picture to use when `source` cannot be loaded. */
  youtubeVideoId?: string | null
}

/** Full-screen blurred artwork with a dark scrim, used behind light-on-dark content. */
export function BlurredBackdrop({ source, youtubeVideoId }: BlurredBackdropProps) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <CoverImage
        source={source}
        youtubeVideoId={youtubeVideoId}
        placeholder={false}
        blurRadius={BLUR_RADIUS}
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, styles.scrim]} />
    </View>
  )
}

const styles = StyleSheet.create({
  scrim: { backgroundColor: colors.playerScrim },
})
