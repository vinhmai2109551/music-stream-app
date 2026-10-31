import { StyleSheet } from "react-native"
import Animated, { FadeInDown, FadeOut } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { colors, radius, shadows, sizes, spacing } from "@/theme"
import { AppText } from "./AppText"

type ToastProps = {
  message: string
}

export function Toast({ message }: ToastProps) {
  const insets = useSafeAreaInsets()
  // Above the tab bar and the mini player, which is where the toast shows up most often.
  const bottom = insets.bottom + sizes.tabBarContent + sizes.miniPlayerHeight + spacing.xl
  return (
    <Animated.View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      entering={FadeInDown.duration(200)}
      exiting={FadeOut.duration(150)}
      pointerEvents="none"
      style={[styles.container, { bottom }]}
    >
      <AppText variant="caption" color="white" numberOfLines={2} style={styles.text}>
        {message}
      </AppText>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    alignSelf: "center",
    maxWidth: "88%",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.text,
    ...shadows.card,
  },
  text: { textAlign: "center" },
})
