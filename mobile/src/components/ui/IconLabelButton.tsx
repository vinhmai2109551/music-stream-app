import type { LucideIcon } from "lucide-react-native"
import { Pressable, StyleSheet, type PressableProps } from "react-native"
import { colors, sizes, spacing, type ColorToken } from "@/theme"
import { AppText } from "./AppText"
import { pressedStyle } from "./pressed"

const ICON_SIZE = 20

type IconLabelButtonProps = Omit<PressableProps, "children" | "style"> & {
  icon: LucideIcon
  label: string
  color?: ColorToken
  active?: boolean
  activeColor?: ColorToken
  /** Accessible name; falls back to the label text. */
  accessibilityLabel?: string
}

/** Icon with a short text (count, caption) next to it. */
export function IconLabelButton({
  icon: Icon,
  label,
  color = "secondary",
  active = false,
  activeColor = "accent",
  accessibilityLabel,
  ...props
}: IconLabelButtonProps) {
  const tint = colors[active ? activeColor : color]
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [styles.base, pressedStyle(pressed)]}
      {...props}
    >
      <Icon size={ICON_SIZE} color={tint} fill={active ? tint : "none"} />
      <AppText variant="caption" numberOfLines={1} style={{ color: tint }}>
        {label}
      </AppText>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    minHeight: sizes.minTouch,
    minWidth: sizes.minTouch,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
})
