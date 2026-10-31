import { Search, X } from "lucide-react-native"
import { useState, type Ref } from "react"
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputInstance,
  type TextInputProps,
} from "react-native"
import { colors, radius, shadows, sizes, spacing, typography } from "@/theme"
import { pressedStyle } from "./pressed"

type SearchBarProps = Omit<TextInputProps, "style" | "value"> & {
  value: string
  onClear: () => void
  ref?: Ref<TextInputInstance>
}

export function SearchBar({ value, onClear, ref, onFocus, onBlur, ...props }: SearchBarProps) {
  const [focused, setFocused] = useState(false)
  // The thicker ring grows inward, so the padding shrinks to keep the text where it was.
  const borderWidth = focused ? sizes.borderThick : sizes.borderThin
  const paddingLeft = spacing.lg - (borderWidth - sizes.borderThin)

  return (
    <View
      style={[
        styles.container,
        { borderWidth, paddingLeft, borderColor: focused ? colors.accent : colors.divider },
      ]}
    >
      <Search size={sizes.iconMd} strokeWidth={1.75} color={colors.tertiary} />
      <TextInput
        ref={ref}
        value={value}
        style={styles.input}
        placeholderTextColor={colors.secondary}
        selectionColor={colors.accent}
        returnKeyType="search"
        autoCorrect={false}
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
      {value.length > 0 && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          onPress={onClear}
          hitSlop={8}
          style={({ pressed }) => [styles.clear, pressedStyle(pressed)]}
        >
          <X size={sizes.iconSm} strokeWidth={2} color={colors.white} />
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    height: sizes.searchBarHeight,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingRight: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    ...shadows.soft,
  },
  input: {
    flex: 1,
    minWidth: 0,
    color: colors.text,
    ...typography.body,
    paddingVertical: 0,
    outlineWidth: 0,
    outlineColor: colors.transparent,
  },
  clear: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.text,
  },
})
