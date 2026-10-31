import { Clock, X } from "lucide-react-native"
import { Pressable, StyleSheet, View } from "react-native"
import { AppText } from "@/components/ui/AppText"
import { IconButton } from "@/components/ui/IconButton"
import { pressedStyle } from "@/components/ui/pressed"
import { copy } from "@/constants/copy"
import { colors, sizes, spacing } from "@/theme"

type RecentSearchesProps = {
  searches: readonly string[]
  onPick: (query: string) => void
  onRemove: (query: string) => void
  onClear: () => void
}

/** What was searched before, newest first. */
export function RecentSearches({ searches, onPick, onRemove, onClear }: RecentSearchesProps) {
  return (
    <View>
      <View style={styles.header}>
        <AppText variant="subtitle">{copy.search.recentTitle}</AppText>
        <Pressable
          accessibilityRole="button"
          onPress={onClear}
          hitSlop={8}
          style={({ pressed }) => [styles.clear, pressedStyle(pressed)]}
        >
          <AppText variant="caption" color="accentText">
            {copy.search.clearAll}
          </AppText>
        </Pressable>
      </View>
      {searches.map((search) => (
        <View key={search} style={styles.row}>
          <Pressable
            accessibilityRole="button"
            onPress={() => onPick(search)}
            style={({ pressed }) => [styles.main, pressedStyle(pressed)]}
          >
            <Clock size={sizes.iconMd} color={colors.secondary} />
            <AppText numberOfLines={1} ellipsizeMode="tail" style={styles.text}>
              {search}
            </AppText>
          </Pressable>
          <IconButton
            icon={X}
            label={`${copy.search.removeRecent}: ${search}`}
            onPress={() => onRemove(search)}
          />
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    minHeight: sizes.minTouch,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  clear: { minHeight: sizes.minTouch, justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center" },
  main: {
    flex: 1,
    minWidth: 0,
    minHeight: sizes.minTouch,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  text: { flex: 1 },
})
