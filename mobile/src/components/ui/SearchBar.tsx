import { Search, X } from "lucide-react-native"
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from "react-native"
import { colors, radius, shadows, sizes, spacing, typography } from "@/theme"
import { pressedStyle } from "./pressed"

type SearchBarProps = Omit<TextInputProps, "style" | "value"> & {
  value: string
  onClear: () => void
}

export function SearchBar({ value, onClear, ...props }: SearchBarProps) {
  return (
    <View style={styles.container}>
      <Search size={sizes.iconMd} strokeWidth={1.75} color={colors.tertiary} />
      <TextInput
        value={value}
        style={styles.input}
        placeholderTextColor={colors.secondary}
        selectionColor={colors.accent}
        returnKeyType="search"
        autoCorrect={false}
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
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: sizes.borderThin,
    borderColor: colors.divider,
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
