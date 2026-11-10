import {
  StyleSheet,
  useColorScheme,
  type ImageStyle,
  type TextStyle,
  type ViewStyle,
} from "react-native"
import { darkColors, lightColors, type Palette } from "./colors"

/** The palette that fits the device's light / dark setting (it follows the system live). */
export function useColors(): Palette {
  return useColorScheme() === "dark" ? darkColors : lightColors
}

type Styles = Record<string, ViewStyle | TextStyle | ImageStyle>

/**
 * Styles that depend on the theme. Write them as a function of the palette, once per file:
 *
 *   const useStyles = makeStyles((colors) => ({ screen: { backgroundColor: colors.background } }))
 *
 * and call `const styles = useStyles()` in the component. Each palette's StyleSheet is built once.
 */
export function makeStyles<T extends Styles>(factory: (colors: Palette) => T): () => T {
  const built = new Map<Palette, T>()
  return function useStyles(): T {
    const palette = useColors()
    let styles = built.get(palette)
    if (!styles) {
      styles = StyleSheet.create(factory(palette)) as T
      built.set(palette, styles)
    }
    return styles
  }
}
