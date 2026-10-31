import { Pressable, StyleSheet, View } from "react-native"
import { colors, radius, sizes, spacing } from "@/theme"
import { AppText } from "./AppText"
import { pressedStyle } from "./pressed"

export type TabItem<Key extends string> = { key: Key; label: string }

type UnderlineTabsProps<Key extends string> = {
  tabs: readonly TabItem<Key>[]
  selected: Key
  onSelect: (key: Key) => void
}

/** A row of equal tabs; the chosen one is accent coloured and underlined. */
export function UnderlineTabs<Key extends string>({
  tabs,
  selected,
  onSelect,
}: UnderlineTabsProps<Key>) {
  return (
    <View accessibilityRole="tablist" style={styles.row}>
      {tabs.map((tab) => {
        const active = tab.key === selected
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(tab.key)}
            style={({ pressed }) => [styles.tab, pressedStyle(pressed)]}
          >
            <AppText
              variant="bodyMedium"
              color={active ? "accentText" : "secondary"}
              numberOfLines={1}
            >
              {tab.label}
            </AppText>
            <View style={[styles.underline, active && styles.underlineActive]} />
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: "row" },
  tab: {
    flex: 1,
    minHeight: sizes.minTouch,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing.sm,
  },
  underline: {
    alignSelf: "stretch",
    height: sizes.borderThick + 1,
    borderRadius: radius.pill,
    backgroundColor: colors.transparent,
  },
  underlineActive: { backgroundColor: colors.accent },
})
