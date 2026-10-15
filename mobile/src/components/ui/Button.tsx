import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native"
import { colors, radius, shadows, sizes, spacing } from "@/theme"
import { AppText } from "./AppText"
import { pressedStyle } from "./pressed"

type Variant = "primary" | "secondary" | "text" | "dark" | "glass"

type ButtonProps = Omit<PressableProps, "style" | "children"> & {
  label: string
  variant?: Variant
  compact?: boolean
  /** Shows a spinner and ignores presses while an action is running. */
  loading?: boolean
  style?: StyleProp<ViewStyle>
}

const TEXT_COLOR = {
  primary: "white",
  secondary: "text",
  text: "accent",
  dark: "white",
  glass: "white",
} as const

export function Button({
  label,
  variant = "primary",
  compact = false,
  loading = false,
  style,
  disabled,
  ...props
}: ButtonProps) {
  const inactive = disabled || loading
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      hitSlop={compact ? { top: 6, bottom: 6 } : undefined}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        styles[variant],
        disabled && styles.disabled,
        pressedStyle(pressed),
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={colors[TEXT_COLOR[variant]]} />
      ) : (
        <AppText
          variant={compact ? "caption" : "button"}
          color={TEXT_COLOR[variant]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {label}
        </AppText>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    minHeight: sizes.minTouch,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  compact: {
    minHeight: 32,
    paddingHorizontal: spacing.md,
  },
  primary: { backgroundColor: colors.accent, ...shadows.card },
  secondary: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.divider },
  text: { backgroundColor: "transparent" },
  dark: { backgroundColor: colors.text },
  glass: { backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder },
  disabled: { opacity: 0.5 },
})
