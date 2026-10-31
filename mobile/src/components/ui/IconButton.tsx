import type { LucideIcon } from "lucide-react-native"
import { Pressable, StyleSheet, type PressableProps } from "react-native"
import { colors, radius, sizes, type ColorToken } from "@/theme"
import { pressedStyle } from "./pressed"

const STROKE_WIDTH = 1.75

type IconButtonProps = Omit<PressableProps, "children"> & {
  icon: LucideIcon
  label: string
  active?: boolean
  color?: ColorToken
  /** Color used when active. Defaults to `accentText`; pass `accent` on dark backgrounds. */
  activeColor?: ColorToken
  size?: number
}

export function IconButton({
  icon: Icon,
  label,
  active = false,
  color = "secondary",
  activeColor = "accentText",
  size = sizes.icon,
  style,
  ...props
}: IconButtonProps) {
  const tint = colors[active ? activeColor : color]
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      style={(state) => [
        styles.base,
        pressedStyle(state.pressed),
        typeof style === "function" ? style(state) : style,
      ]}
      {...props}
    >
      <Icon size={size} strokeWidth={STROKE_WIDTH} color={tint} fill={active ? tint : "none"} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    width: sizes.minTouch,
    height: sizes.minTouch,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
})
