import { useEffect } from "react"
import { View } from "react-native"
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated"
import { makeStyles, radius, sizes, spacing } from "@/theme"

const DOTS = [0, 1, 2]
const STEP_MS = 160
const LOW = 0.3

function Dot({ index, still }: { index: number; still: boolean }) {
  const styles = useStyles()

  const opacity = useSharedValue(still ? 1 : LOW)
  useEffect(() => {
    if (still) {
      opacity.value = 1
      return
    }
    opacity.value = withDelay(
      index * STEP_MS,
      withRepeat(
        withSequence(
          withTiming(1, { duration: STEP_MS * 2 }),
          withTiming(LOW, { duration: STEP_MS * 2 }),
        ),
        -1,
      ),
    )
    return () => cancelAnimation(opacity)
  }, [index, opacity, still])

  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }))
  return <Animated.View style={[styles.dot, animated]} />
}

/** Three dots that pulse while the assistant has not written anything yet. Still if motion is reduced. */
export function TypingDots() {
  const styles = useStyles()

  const reduced = useReducedMotion()
  return (
    <View style={styles.row}>
      {DOTS.map((index) => (
        <Dot key={index} index={index} still={reduced} />
      ))}
    </View>
  )
}

const useStyles = makeStyles((colors) => ({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    height: sizes.typingDot * 3,
  },
  dot: {
    width: sizes.typingDot,
    height: sizes.typingDot,
    borderRadius: radius.pill,
    backgroundColor: colors.secondary,
  },
}))
