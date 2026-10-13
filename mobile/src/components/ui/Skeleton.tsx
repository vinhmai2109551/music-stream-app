import { useEffect } from "react"
import type { DimensionValue, StyleProp, ViewStyle } from "react-native"
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated"
import { colors, radius } from "@/theme"

const PULSE_DURATION = 800
const PULSE_MIN_OPACITY = 0.45

type SkeletonProps = {
  width?: DimensionValue
  height?: DimensionValue
  rounded?: number
  style?: StyleProp<ViewStyle>
}

export function Skeleton({
  width = "100%",
  height = 16,
  rounded = radius.cover,
  style,
}: SkeletonProps) {
  const opacity = useSharedValue(1)

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(PULSE_MIN_OPACITY, {
        duration: PULSE_DURATION,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true,
    )
  }, [opacity])

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }))

  return (
    <Animated.View
      accessibilityElementsHidden
      style={[
        { width, height, borderRadius: rounded, backgroundColor: colors.divider },
        animatedStyle,
        style,
      ]}
    />
  )
}
