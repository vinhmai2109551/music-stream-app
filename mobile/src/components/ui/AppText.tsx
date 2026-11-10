import { Text, type TextProps } from "react-native"
import { type ColorToken, typography, type TypographyVariant, useColors } from "@/theme"

type AppTextProps = TextProps & {
  variant?: TypographyVariant
  color?: ColorToken
}

export function AppText({ variant = "body", color = "text", style, ...props }: AppTextProps) {
  const colors = useColors()

  return <Text {...props} style={[typography[variant], { color: colors[color] }, style]} />
}
