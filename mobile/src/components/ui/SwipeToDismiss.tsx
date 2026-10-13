import type { ReactNode } from "react"
import { StyleSheet } from "react-native"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated"
import { DISMISS_DISTANCE } from "@/constants/player"

const ACTIVATION_OFFSET = 20
const SNAP_BACK_MS = 180

type SwipeToDismissProps = {
  onDismiss: () => void
  children: ReactNode
}

/** Drag the content down to dismiss it. Horizontal drags (e.g. a seek bar) are left alone. */
export function SwipeToDismiss({ onDismiss, children }: SwipeToDismissProps) {
  const offset = useSharedValue(0)

  const pan = Gesture.Pan()
    .activeOffsetY(ACTIVATION_OFFSET)
    .failOffsetX([-ACTIVATION_OFFSET, ACTIVATION_OFFSET])
    .runOnJS(true)
    .onUpdate((event) => {
      offset.value = Math.max(0, event.translationY)
    })
    .onEnd((event) => {
      if (event.translationY > DISMISS_DISTANCE) onDismiss()
      offset.value = withTiming(0, { duration: SNAP_BACK_MS })
    })

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: offset.value }] }))

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.fill, style]}>{children}</Animated.View>
    </GestureDetector>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
})
