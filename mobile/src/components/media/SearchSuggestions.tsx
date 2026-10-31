import { Pressable, StyleSheet, View } from "react-native"
import { AppText } from "@/components/ui/AppText"
import { Skeleton } from "@/components/ui/Skeleton"
import { pressedStyle } from "@/components/ui/pressed"
import { useSearchSuggestions } from "@/hooks/useSearch"
import { colors, sizes, spacing } from "@/theme"

const SKELETON_ROWS = 4

type SearchSuggestionsProps = {
  /** What has been typed (already debounced). */
  query: string
  onPick: (suggestion: string) => void
}

/** Words that match what is being typed, one per line. */
export function SearchSuggestions({ query, onPick }: SearchSuggestionsProps) {
  const { state } = useSearchSuggestions(query)

  if (state.status === "loading") {
    return (
      <View style={styles.skeleton}>
        {Array.from({ length: SKELETON_ROWS }, (_, index) => (
          <Skeleton key={index} width={`${80 - index * 12}%`} height={sizes.iconMd} />
        ))}
      </View>
    )
  }
  // A failed lookup just shows no words; the search itself still works.
  if (state.status === "error") return null

  return (
    <View>
      {state.data.map((suggestion) => (
        <Pressable
          key={suggestion}
          accessibilityRole="button"
          onPress={() => onPick(suggestion)}
          style={({ pressed }) => [styles.row, pressedStyle(pressed)]}
        >
          <AppText numberOfLines={1} ellipsizeMode="tail">
            {suggestion}
          </AppText>
        </Pressable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    minHeight: sizes.minTouch + spacing.sm,
    justifyContent: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  skeleton: { gap: spacing.xl, paddingTop: spacing.lg },
})
