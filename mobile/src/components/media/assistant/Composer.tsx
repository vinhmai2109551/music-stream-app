import { ArrowUp, Square } from "lucide-react-native"
import { useState } from "react"
import { Pressable, TextInput, View } from "react-native"
import { pressedStyle } from "@/components/ui/pressed"
import { copy } from "@/constants/copy"
import { makeStyles, radius, sizes, spacing, typography, useColors } from "@/theme"

/** Same limit as the server (a message is at most 2000 characters). */
const MAX_LENGTH = 2000

type ComposerProps = {
  /** An answer is being written: the button stops it instead of sending. */
  streaming: boolean
  /** Nothing can be sent (the day's messages are used up). */
  disabled: boolean
  onSend: (text: string) => void
  /** Cancels the answer; returns the question to put back in the box, if it should be. */
  onStop: () => string | null
}

/** The box at the bottom: a text field that grows to a few lines, and Send / Stop. */
export function Composer({ streaming, disabled, onSend, onStop }: ComposerProps) {
  const styles = useStyles()
  const colors = useColors()

  const [text, setText] = useState("")
  const canSend = !streaming && !disabled && text.trim().length > 0

  const send = () => {
    if (!canSend) return
    onSend(text.trim())
    setText("")
  }
  const stop = () => {
    const restored = onStop()
    if (restored !== null) setText((current) => (current.length > 0 ? current : restored))
  }

  return (
    <View style={styles.row}>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={copy.assistant.composerPlaceholder}
        placeholderTextColor={colors.secondary}
        selectionColor={colors.accent}
        maxLength={MAX_LENGTH}
        multiline
        editable={!disabled}
        accessibilityLabel={copy.assistant.composerLabel}
        style={styles.input}
      />
      {streaming ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.assistant.stop}
          onPress={stop}
          style={({ pressed }) => [styles.button, styles.stop, pressedStyle(pressed)]}
        >
          <Square size={sizes.iconSm} fill={colors.white} color={colors.white} />
        </Pressable>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.assistant.send}
          accessibilityState={{ disabled: !canSend }}
          disabled={!canSend}
          onPress={send}
          style={({ pressed }) => [
            styles.button,
            canSend ? styles.send : styles.sendOff,
            pressedStyle(pressed),
          ]}
        >
          <ArrowUp
            size={sizes.icon}
            strokeWidth={2.25}
            color={canSend ? colors.onAccent : colors.secondary}
          />
        </Pressable>
      )}
    </View>
  )
}

const useStyles = makeStyles((colors) => ({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: sizes.composerMin,
    maxHeight: sizes.composerMax,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderRadius: radius.card,
    borderWidth: sizes.borderThin,
    borderColor: colors.divider,
    backgroundColor: colors.background,
    color: colors.text,
    ...typography.body,
    outlineWidth: 0,
  },
  button: {
    width: sizes.composerMin,
    height: sizes.composerMin,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  send: { backgroundColor: colors.accent },
  sendOff: { backgroundColor: colors.surface },
  stop: { backgroundColor: colors.elevated },
}))
