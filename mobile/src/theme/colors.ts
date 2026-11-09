/**
 * Colour tokens in two palettes. Components read the one that fits the device with `useColors()`
 * (see ./useTheme); the plain `colors` below is the LIGHT palette, for the few module-level
 * constants that never change with the theme (gradients, placeholders).
 *
 * Tokens that mean the same on every screen of both themes are identical in both palettes (the
 * accent fill, white / black, the glass and scrim overlays used on photos). The others flip:
 * surfaces, text, dividers and the accent colour used for text. Every text / background pair that
 * the app uses reaches WCAG AA (4.5:1) in both; `__tests__/theme/colors.test.ts` checks it.
 */
const lightTokens = {
  accent: "#1FB8E0",
  /** Accent for text and icons on light backgrounds (5.1:1 on white, 4.8:1 on surface); `accent` itself is for fills. */
  accentText: "#0A7799",
  /** Label color on top of an accent fill (7:1); white would only reach 2.3:1. */
  onAccent: "#04212B",
  accentSoft: "rgba(31, 184, 224, 0.12)",
  accentFaint: "rgba(31, 184, 224, 0.08)",
  background: "#FFFFFF",
  surface: "#F5F7FA",
  text: "#111827",
  secondary: "#6B7280",
  tertiary: "#8A93A3",
  divider: "#E5E7EB",
  /** Near-black that stays near-black in both themes: screens that are dark by design, shadows. */
  ink: "#111827",
  /** A card that stands out from the page (mini player, toast): dark on light, lighter on dark. */
  elevated: "#111827",
  success: "#22C55E",
  like: "#EF4444",
  /** Error red for dark, photo-backed screens (5.7:1 and up on the form panel). */
  likeOnDark: "#F87171",
  white: "#FFFFFF",
  black: "#000000",
  onDarkMuted: "rgba(255, 255, 255, 0.72)",
  onDarkFaint: "rgba(255, 255, 255, 0.15)",
  glass: "rgba(255, 255, 255, 0.12)",
  glassField: "rgba(255, 255, 255, 0.14)",
  panel: "rgba(12, 16, 28, 0.6)",
  scrimDeep: "rgba(8, 10, 18, 0.94)",
  glassBorder: "rgba(255, 255, 255, 0.25)",
  tabBar: "rgba(255, 255, 255, 0.95)",
  backdrop: "rgba(0, 0, 0, 0.45)",
  heroScrimTop: "rgba(0, 0, 0, 0.15)",
  heroScrimMid: "rgba(0, 0, 0, 0.05)",
  premiumStart: "#5B20D3",
  premiumEnd: "#D72EE7",
  premiumAccent: "#6F2BE8",
  premiumTint: "#F5F3FF",
  premiumText: "#7C3AED",
  premiumCheck: "#8B5CF6",
  /** The assistant's mascot: the same in both themes (it is a drawing, not a surface). */
  mascotInk: "#334155",
  mascotStem: "#6D4AE8",
  mascotPink: "#F9A8D4",
  mascotViolet: "#8B5CF6",
  mascotCyan: "#67E8F9",
  mascotCheek: "rgba(249, 168, 212, 0.65)",
  mascotGlow: "rgba(167, 139, 250, 0.45)",
  mascotGlowActive: "rgba(34, 211, 238, 0.7)",
  mascotShadow: "#7C3AED",
  playerScrim: "rgba(0, 0, 0, 0.6)",
  cardScrim: "rgba(0, 0, 0, 0.8)",
  transparent: "transparent",
} as const

export type ColorToken = keyof typeof lightTokens

/** Gradients are the same in both themes (white text reads on all of them). */
const gradients = {
  chartGradients: {
    violet: ["#6D28D9", "#D946EF"],
    cyan: ["#22D3EE", "#4F46E5"],
    orange: ["#FB923C", "#EC4899"],
  },
  /** The mascot's tile in the tab bar: at rest, and while it is pressed. */
  mascotGradients: {
    idle: ["#C4B5FD", "#818CF8", "#67E8F9"],
    active: ["#F9A8D4", "#A78BFA", "#67E8F9"],
  },
  /** Backgrounds of pictures that have no photo; one is picked per item. White reads on all. */
  coverGradients: [
    ["#B91C1C", "#EA580C"],
    ["#7E22CE", "#DB2777"],
    ["#1D4ED8", "#0891B2"],
    ["#047857", "#0E7490"],
    ["#BE185D", "#9333EA"],
    ["#4338CA", "#7C3AED"],
    ["#0F766E", "#2563EB"],
    ["#9F1239", "#C2410C"],
  ],
  categoryGradients: {
    pop: ["#D946EF", "#F472B6"],
    electronic: ["#06B6D4", "#3B82F6"],
    indie: ["#FBBF24", "#F97316"],
    chill: ["#8B5CF6", "#6366F1"],
  },
} as const

/** One palette: every token is a colour string, plus the shared gradients. */
export type Palette = { readonly [Token in ColorToken]: string } & typeof gradients

export const lightColors: Palette = { ...lightTokens, ...gradients }

/** Only the tokens that differ from the light palette are written out. */
export const darkColors: Palette = {
  ...lightColors,
  accentText: "#4CCBEC",
  accentSoft: "rgba(31, 184, 224, 0.2)",
  accentFaint: "rgba(31, 184, 224, 0.14)",
  background: "#0B0F17",
  surface: "#151B27",
  text: "#F3F4F6",
  secondary: "#A1AAB8",
  tertiary: "#7C8698",
  divider: "#252D3C",
  elevated: "#1F2937",
  like: "#F87171",
  tabBar: "rgba(11, 15, 23, 0.95)",
  premiumTint: "#1D1838",
  premiumText: "#C4B5FD",
  premiumCheck: "#A78BFA",
}

/** The light palette. Use `useColors()` in components so they follow the device's theme. */
export const colors = lightColors
