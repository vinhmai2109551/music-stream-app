import { afterEach, describe, expect, it, jest } from "@jest/globals"
import { render, renderHook, screen } from "@testing-library/react-native"
import { StyleSheet, View } from "react-native"
import { AppText } from "@/components/ui/AppText"
import { Button } from "@/components/ui/Button"
import { darkColors, lightColors, makeStyles, useColors, type Palette } from "@/theme"

// The device's setting, which the test changes (Jest has no real Appearance module).
let mockScheme: "light" | "dark" = "light"
jest.mock("react-native/Libraries/Utilities/useColorScheme", () => ({
  __esModule: true,
  default: () => mockScheme,
}))
const setScheme = (scheme: "light" | "dark") => {
  mockScheme = scheme
}

/** WCAG 2.1 contrast ratio of two #RRGGBB colours. */
function contrast(foreground: string, background: string): number {
  const luminance = (hex: string) => {
    const value = parseInt(hex.slice(1), 16)
    const [r, g, b] = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((channel) => {
      const c = channel / 255
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a)
  return (light + 0.05) / (dark + 0.05)
}

/** The AA minimum for normal text, and for icons and other graphics. */
const TEXT = 4.5
const GRAPHIC = 3

const palettes: [string, Palette][] = [
  ["light", lightColors],
  ["dark", darkColors],
]

describe.each(palettes)("the %s palette", (_name, palette) => {
  it("keeps normal text readable on the pages and cards it sits on (WCAG AA)", () => {
    for (const background of [palette.background, palette.surface]) {
      expect(contrast(palette.text, background)).toBeGreaterThanOrEqual(7)
      expect(contrast(palette.secondary, background)).toBeGreaterThanOrEqual(TEXT)
      expect(contrast(palette.accentText, background)).toBeGreaterThanOrEqual(TEXT)
    }
  })

  it("keeps the label on an accent button readable", () => {
    expect(contrast(palette.onAccent, palette.accent)).toBeGreaterThanOrEqual(TEXT)
  })

  it("keeps icons and placeholders visible", () => {
    expect(contrast(palette.tertiary, palette.background)).toBeGreaterThanOrEqual(GRAPHIC)
    expect(contrast(palette.like, palette.background)).toBeGreaterThanOrEqual(GRAPHIC)
  })

  it("keeps white text readable on a raised card (mini player, toast)", () => {
    expect(contrast(palette.white, palette.elevated)).toBeGreaterThanOrEqual(7)
  })

  it("keeps the Premium text readable on its tinted card and on the page", () => {
    expect(contrast(palette.premiumText, palette.premiumTint)).toBeGreaterThanOrEqual(TEXT)
    expect(contrast(palette.premiumText, palette.background)).toBeGreaterThanOrEqual(TEXT)
  })

  it("keeps the near-black ink and the photo overlays for dark-by-design screens", () => {
    expect(palette.ink).toBe("#111827")
    expect(palette.white).toBe("#FFFFFF")
    expect(palette.panel).toBe(lightColors.panel)
    expect(palette.scrimDeep).toBe(lightColors.scrimDeep)
  })
})

describe("the two palettes", () => {
  it("have the same tokens", () => {
    expect(Object.keys(darkColors).sort()).toEqual(Object.keys(lightColors).sort())
  })

  it("flip the surfaces and the text", () => {
    for (const token of [
      "background",
      "surface",
      "text",
      "secondary",
      "divider",
      "tabBar",
    ] as const) {
      expect(darkColors[token]).not.toBe(lightColors[token])
    }
    expect(contrast(darkColors.text, darkColors.background)).toBeGreaterThan(7)
    expect(darkColors.background).toBe("#0B0F17")
  })

  it("leave the accent fill, the labels on it and the gradients alone", () => {
    for (const token of ["accent", "onAccent", "white", "black", "ink", "success"] as const) {
      expect(darkColors[token]).toBe(lightColors[token])
    }
    expect(darkColors.coverGradients).toBe(lightColors.coverGradients)
  })
})

describe("following the device theme", () => {
  afterEach(() => {
    setScheme("light")
  })

  it("useColors gives the light palette by default and the dark one in dark mode", async () => {
    setScheme("light")
    const light = await renderHook(() => useColors())
    expect(light.result.current).toBe(lightColors)

    setScheme("dark")
    const dark = await renderHook(() => useColors())
    expect(dark.result.current).toBe(darkColors)
  })

  it("AppText takes its colour from the current theme", async () => {
    setScheme("light")
    await render(<AppText color="secondary">Hello</AppText>)
    expect(screen.getByText("Hello")).toHaveStyle({ color: lightColors.secondary })

    setScheme("dark")
    await render(<AppText color="secondary">Hello</AppText>)
    expect(screen.getByText("Hello")).toHaveStyle({ color: darkColors.secondary })
  })

  it("makeStyles builds the styles once per palette and reuses them", async () => {
    const useStyles = makeStyles((colors) => ({ box: { backgroundColor: colors.background } }))
    setScheme("light")
    const first = await renderHook(() => useStyles())
    const again = await renderHook(() => useStyles())
    expect(first.result.current).toBe(again.result.current)

    setScheme("dark")
    const dark = await renderHook(() => useStyles())
    expect(dark.result.current).not.toBe(first.result.current)

    function Box() {
      const styles = useStyles()
      return <View testID="box" style={styles.box} />
    }
    await render(<Box />)
    expect(screen.getByTestId("box")).toHaveStyle({ backgroundColor: darkColors.background })
  })
})

describe("the secondary button (Đăng xuất, Huỷ)", () => {
  it.each(palettes)(
    "keeps its label readable on its fill in the %s theme",
    async (name, palette) => {
      setScheme(name as "light" | "dark")
      await render(<Button label="Đăng xuất" variant="secondary" />)

      const style = StyleSheet.flatten(screen.getByRole("button").props.style)

      // The fill follows the theme like the label does; a fixed white once hid the label in dark mode.
      expect(style.backgroundColor).toBe(palette.background)
      expect(contrast(palette.text, style.backgroundColor as string)).toBeGreaterThanOrEqual(TEXT)
    },
  )
})
