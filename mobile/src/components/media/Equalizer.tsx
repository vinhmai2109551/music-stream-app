import { useEffect } from "react"
import { StyleSheet, View } from "react-native"
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated"
import { colors, radius, sizes, spacing } from "@/theme"

const BAR_DELAYS_MS = [0, 120, 240]
const BAR_DURATION_MS = 700
const MIN_SCALE = 0.35

function Bar({ delay }: { delay: number }) {
  const scale = useSharedValue(MIN_SCALE)

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: BAR_DURATION_MS, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      ),
    )
  }, [delay, scale])

  const style = useAnimatedStyle(() => ({ transform: [{ scaleY: scale.value }] }))
  return <Animated.View style={[styles.bar, style]} />
}

/** Animated "now playing" bars. */
export function Equalizer() {
  return (
    <View accessibilityLabel="Playing" style={styles.container}>
      {BAR_DELAYS_MS.map((delay) => (
        <Bar key={delay} delay={delay} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    height: sizes.equalizerHeight,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.xxs,
  },
  bar: {
    width: sizes.equalizerBarWidth,
    height: sizes.equalizerHeight,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    transformOrigin: "bottom",
  },
})
