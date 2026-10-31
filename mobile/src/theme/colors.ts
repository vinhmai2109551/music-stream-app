export const colors = {
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
  playerScrim: "rgba(0, 0, 0, 0.6)",
  cardScrim: "rgba(0, 0, 0, 0.8)",
  transparent: "transparent",
  chartGradients: {
    violet: ["#6D28D9", "#D946EF"],
    cyan: ["#22D3EE", "#4F46E5"],
    orange: ["#FB923C", "#EC4899"],
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

export type ColorToken = Exclude<
  keyof typeof colors,
  "categoryGradients" | "chartGradients" | "coverGradients"
>
