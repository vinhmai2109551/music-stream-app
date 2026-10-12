import { Pressable, StyleSheet, View } from "react-native"
import { sizes, spacing } from "@/theme"
import { AppText } from "./AppText"
import { pressedStyle } from "./pressed"

type SectionHeaderProps = {
  title: string
  action?: string
  onAction?: () => void
}

export function SectionHeader({ title, action = "See all", onAction }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <AppText variant="title" numberOfLines={1} style={styles.title}>
        {title}
      </AppText>
      {onAction && (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={({ pressed }) => [styles.action, pressedStyle(pressed)]}
        >
          <AppText variant="caption" color="secondary">
            {action}
          </AppText>
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  title: { flex: 1 },
  action: {
    minHeight: sizes.minTouch,
    justifyContent: "center",
    paddingLeft: spacing.sm,
  },
})
