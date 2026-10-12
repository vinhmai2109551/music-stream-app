import { Text, type TextProps } from "react-native"
import { colors, typography, type ColorToken, type TypographyVariant } from "@/theme"

type AppTextProps = TextProps & {
  variant?: TypographyVariant
  color?: ColorToken
}

export function AppText({ variant = "body", color = "text", style, ...props }: AppTextProps) {
  return <Text {...props} style={[typography[variant], { color: colors[color] }, style]} />
}
