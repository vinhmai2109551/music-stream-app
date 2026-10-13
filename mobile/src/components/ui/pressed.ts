import type { ViewStyle } from "react-native"

const PRESSED_SCALE = 0.97
const PRESSED_OPACITY = 0.8

/** Shared pressed feedback for every tappable element. */
export const pressedStyle = (pressed: boolean): ViewStyle =>
  pressed ? { opacity: PRESSED_OPACITY, transform: [{ scale: PRESSED_SCALE }] } : {}
