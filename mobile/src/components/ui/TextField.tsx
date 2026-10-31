import { CircleAlert, Eye, EyeOff } from "lucide-react-native"
import { useState, type Ref } from "react"
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputInstance,
  type TextInputProps,
} from "react-native"
import { copy } from "@/constants/copy"
import { colors, radius, sizes, spacing, typography } from "@/theme"
import { AppText } from "./AppText"
import { pressedStyle } from "./pressed"

type TextFieldProps = Omit<TextInputProps, "style" | "secureTextEntry"> & {
  label: string
  error?: string
  /** Password field with a show / hide button. */
  password?: boolean
  ref?: Ref<TextInputInstance>
}

/** Labelled text input for dark, photo-backed screens (glass look, red when invalid). */
export function TextField({
  label,
  error,
  password = false,
  ref,
  onFocus,
  onBlur,
  editable = true,
  ...props
}: TextFieldProps) {
  const [focused, setFocused] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const highlighted = focused || Boolean(error)
  const borderColor = error ? colors.likeOnDark : focused ? colors.accent : colors.glassBorder
  // The thicker ring grows inward, so shift the padding to keep the text where it was.
  const borderWidth = highlighted ? sizes.borderThick : sizes.borderThin
  const paddingLeft = spacing.lg - (borderWidth - sizes.borderThin)

  return (
    <View>
      <AppText variant="caption" color="white" style={styles.label}>
        {label}
      </AppText>
      <View
        style={[
          styles.container,
          { borderColor, borderWidth, paddingLeft },
          !editable && styles.disabled,
        ]}
      >
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          accessibilityHint={error}
          style={styles.input}
          placeholderTextColor={colors.onDarkMuted}
          selectionColor={colors.accent}
          autoCorrect={false}
          editable={editable}
          secureTextEntry={password && !revealed}
          onFocus={(event) => {
            setFocused(true)
            onFocus?.(event)
          }}
          onBlur={(event) => {
            setFocused(false)
            onBlur?.(event)
          }}
          {...props}
        />
        {password && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? copy.auth.hidePassword : copy.auth.showPassword}
            onPress={() => setRevealed((value) => !value)}
            style={({ pressed }) => [styles.toggle, pressedStyle(pressed)]}
          >
            {revealed ? (
              <EyeOff size={sizes.iconMd} color={colors.onDarkMuted} />
            ) : (
              <Eye size={sizes.iconMd} color={colors.onDarkMuted} />
            )}
          </Pressable>
        )}
      </View>
      {error ? (
        <View style={styles.errorRow}>
          <CircleAlert size={sizes.iconSm} color={colors.likeOnDark} />
          <AppText
            variant="caption"
            color="likeOnDark"
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={styles.errorText}
          >
            {error}
          </AppText>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  label: { marginBottom: spacing.xs },
  container: {
    height: sizes.searchBarHeight,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.card,
    backgroundColor: colors.glassField,
  },
  disabled: { opacity: 0.6 },
  input: {
    flex: 1,
    minWidth: 0,
    height: "100%",
    color: colors.white,
    ...typography.body,
    paddingVertical: 0,
    outlineWidth: 0,
  },
  toggle: {
    width: sizes.minTouch,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  errorText: { flex: 1 },
})
