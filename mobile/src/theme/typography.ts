import type { TextStyle } from "react-native"

export const fontFamily = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
} as const

export const typography = {
  display: { fontFamily: fontFamily.bold, fontSize: 40, lineHeight: 48 },
  h1: { fontFamily: fontFamily.bold, fontSize: 32, lineHeight: 40 },
  h2: { fontFamily: fontFamily.bold, fontSize: 28, lineHeight: 36 },
  title: { fontFamily: fontFamily.semibold, fontSize: 20, lineHeight: 26 },
  subtitle: { fontFamily: fontFamily.semibold, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: fontFamily.regular, fontSize: 15, lineHeight: 22 },
  bodyMedium: { fontFamily: fontFamily.medium, fontSize: 15, lineHeight: 22 },
  button: { fontFamily: fontFamily.semibold, fontSize: 16, lineHeight: 22 },
  caption: { fontFamily: fontFamily.medium, fontSize: 13, lineHeight: 18 },
  small: { fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 16 },
  micro: { fontFamily: fontFamily.medium, fontSize: 11, lineHeight: 14 },
} as const satisfies Record<string, TextStyle>

export type TypographyVariant = keyof typeof typography
