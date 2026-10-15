import { Eye, EyeOff } from "lucide-react-native"
import { useState, type Ref } from "react"
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from "react-native"
import { copy } from "@/constants/copy"
import { colors, radius, sizes, spacing, typography } from "@/theme"
import { AppText } from "./AppText"

type TextFieldProps = Omit<TextInputProps, "style" | "secureTextEntry"> & {
  label: string
  error?: string
  /** Password field with a show / hide button. */
  password?: boolean
  ref?: Ref<TextInput>
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
  const borderColor = error ? colors.like : focused ? colors.accent : colors.glassBorder

  return (
    <View>
      <AppText variant="caption" color="onDarkMuted" style={styles.label}>
        {label}
      </AppText>
      <View style={[styles.container, { borderColor }, !editable && styles.disabled]}>
        <TextInput
          ref={ref}
          accessibilityLabel={label}
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
            style={styles.toggle}
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
        <AppText variant="small" color="like" accessibilityRole="alert" style={styles.error}>
          {error}
        </AppText>
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
    paddingLeft: spacing.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    backgroundColor: colors.glass,
  },
  disabled: { opacity: 0.6 },
  input: {
    flex: 1,
    minWidth: 0,
    height: "100%",
    color: colors.white,
    ...typography.body,
    paddingVertical: 0,
  },
  toggle: {
    width: sizes.minTouch,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  error: { marginTop: spacing.xs },
})
