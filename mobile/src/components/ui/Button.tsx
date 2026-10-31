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

type Variant = "primary" | "secondary" | "text" | "glass" | "outline" | "tonal"

type ButtonProps = Omit<PressableProps, "style" | "children"> & {
  label: string
  variant?: Variant
  compact?: boolean
  /** Shows a spinner and ignores presses while an action is running. */
  loading?: boolean
  style?: StyleProp<ViewStyle>
}

const TEXT_COLOR = {
  primary: "onAccent",
  secondary: "text",
  text: "accentText",
  glass: "white",
  outline: "accentText",
  tonal: "accentText",
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
    minHeight: sizes.compactButton,
    paddingHorizontal: spacing.md,
  },
  primary: { backgroundColor: colors.accent, ...shadows.card },
  secondary: {
    backgroundColor: colors.white,
    borderWidth: sizes.borderThin,
    borderColor: colors.divider,
  },
  text: { backgroundColor: colors.transparent },
  glass: {
    backgroundColor: colors.glass,
    borderWidth: sizes.borderThin,
    borderColor: colors.glassBorder,
  },
  outline: {
    backgroundColor: colors.transparent,
    borderWidth: sizes.borderThick,
    borderColor: colors.accentText,
  },
  tonal: { backgroundColor: colors.accentSoft },
  disabled: { opacity: 0.5 },
})
