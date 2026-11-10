import { createContext, useContext } from "react"

export type ColorMode = "light" | "dark"

export interface ColorModeValue {
  mode: ColorMode
  toggle: () => void
}

export const ColorModeContext = createContext<ColorModeValue>({
  mode: "light",
  toggle: () => undefined,
})

export const useColorMode = (): ColorModeValue => useContext(ColorModeContext)

const STORAGE_KEY = "music-stream-admin.colorMode"

/** The mode the person chose last time, else the one of their system. */
export function initialColorMode(): ColorMode {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved === "light" || saved === "dark") return saved
  } catch {
    // Storage can be blocked; fall through to the system setting.
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

export function saveColorMode(mode: ColorMode): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    // Not saved; the choice lasts until the page is closed.
  }
}
