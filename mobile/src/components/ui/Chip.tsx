import { Pressable, StyleSheet, type PressableProps } from "react-native"
import { colors, radius, sizes, spacing } from "@/theme"
import { AppText } from "./AppText"
import { pressedStyle } from "./pressed"

/** Vertical hit slop that lifts the 36pt chip to a 44pt touch target. */
const CHIP_HIT_SLOP = { top: 4, bottom: 4 }

type ChipProps = Omit<PressableProps, "style" | "children"> & {
  label: string
  selected?: boolean
}

export function Chip({ label, selected = false, ...props }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      hitSlop={CHIP_HIT_SLOP}
      style={({ pressed }) => [
        styles.base,
        selected ? styles.selected : styles.idle,
        pressedStyle(pressed),
      ]}
      {...props}
    >
      <AppText variant="caption" color={selected ? "onAccent" : "secondary"} numberOfLines={1}>
        {label}
      </AppText>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    height: sizes.chipHeight,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  selected: { backgroundColor: colors.accent },
  idle: { backgroundColor: colors.surface },
})
