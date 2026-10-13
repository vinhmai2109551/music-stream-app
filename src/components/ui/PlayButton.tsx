import { Pause, Play } from "lucide-react-native"
import { Pressable, StyleSheet } from "react-native"
import { colors, radius, shadows, sizes, spacing } from "@/theme"
import { pressedStyle } from "./pressed"

type PlayButtonProps = {
  playing?: boolean
  onPress: () => void
}

/** Large round accent play/pause button used on collection and artist screens. */
export function PlayButton({ playing = false, onPress }: PlayButtonProps) {
  const Icon = playing ? Pause : Play
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={playing ? "Pause" : "Play"}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressedStyle(pressed)]}
    >
      <Icon size={sizes.icon} color={colors.white} fill={colors.white} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    width: sizes.playButton,
    height: sizes.playButton,
    marginLeft: spacing.sm,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent,
    ...shadows.card,
  },
})
