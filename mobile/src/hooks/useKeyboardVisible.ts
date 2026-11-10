import { useEffect, useState } from "react"
import { Keyboard, Platform } from "react-native"

// iOS reports the keyboard before it moves; Android only after it is shown or hidden.
const SHOW = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow"
const HIDE = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide"

/** Whether the on-screen keyboard is up. */
export function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const show = Keyboard.addListener(SHOW, () => setVisible(true))
    const hide = Keyboard.addListener(HIDE, () => setVisible(false))
    return () => {
      show.remove()
      hide.remove()
    }
  }, [])

  return visible
}
