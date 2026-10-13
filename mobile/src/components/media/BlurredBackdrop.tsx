import { Image } from "expo-image"
import { StyleSheet, View } from "react-native"
import { colors } from "@/theme"
import type { ImageSource } from "@/types"

const BLUR_RADIUS = 60

type BlurredBackdropProps = {
  source: ImageSource
}

/** Full-screen blurred artwork with a dark scrim, used behind light-on-dark content. */
export function BlurredBackdrop({ source }: BlurredBackdropProps) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Image
        source={source}
        contentFit="cover"
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
