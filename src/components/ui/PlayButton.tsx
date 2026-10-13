import { Pause, Play } from "lucide-react-native"
import { ActivityIndicator, Pressable, StyleSheet } from "react-native"
import { colors, radius, shadows, sizes } from "@/theme"
import { pressedStyle } from "./pressed"

type PlayButtonProps = {
  playing?: boolean
  /** Shows a spinner instead of the icon while audio is loading. */
  loading?: boolean
  size?: number
  onPress: () => void
}

/** Round accent play/pause button. */
export function PlayButton({
  playing = false,
  loading = false,
  size = sizes.playButton,
  onPress,
}: PlayButtonProps) {
  const Icon = playing ? Pause : Play
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={playing ? "Pause" : "Play"}
      accessibilityState={{ busy: loading }}
      onPress={onPress}
      style={({ pressed }) => [styles.button, { width: size, height: size }, pressedStyle(pressed)]}
    >
      {loading ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <Icon size={sizes.icon} color={colors.white} fill={colors.white} />
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent,
    ...shadows.card,
  },
})
