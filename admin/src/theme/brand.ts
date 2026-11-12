/** The colours of the Music Stream app (mobile/src/theme/colors.ts), reused so both look related. */
export const BRAND = {
  /** The accent of the app: fills and, on dark surfaces, text. Labels on it are `cyanInk`. */
  cyan: "#1FB8E0",
  cyanInk: "#04212B",
  /** The accent for light surfaces: white text reaches 4.6:1 on it, the bright cyan only 2.3:1. */
  cyanDeep: "#0A7FA3",
  indigo: "#4F46E5",
  violet: "#6D28D9",
  fuchsia: "#D946EF",
  /** The dark of the side menu and of the banners, in both modes. */
  ink: "#0C1020",
} as const

/**
 * Colours of the charts, one pair per mode. Checked with the dataviz validator (lightness band,
 * chroma, colour-blind separation, 3:1 contrast on the surface), not picked by eye.
 */
export const CHART_COLORS = {
  light: { line: "#0891B2", bars: "#7C3AED" },
  dark: { line: "#0EA5C6", bars: "#9B6BF7" },
} as const

/** Be Vietnam Pro was drawn for Vietnamese: its marks sit well on every vowel. */
export const FONT_STACK =
  '"Be Vietnam Pro", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif'
