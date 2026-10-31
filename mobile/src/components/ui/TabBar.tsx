import type { LucideIcon } from "lucide-react-native"
import { Home, Library, Rss, Search } from "lucide-react-native"
import type { Tabs } from "expo-router"
import type { ComponentProps } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import { colors, sizes, spacing } from "@/theme"
import { AppText } from "./AppText"
import { pressedStyle } from "./pressed"

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0]

type TabConfig = { label: string; icon: LucideIcon }

const TABS: Record<string, TabConfig> = {
  index: { label: "Home", icon: Home },
  search: { label: "Search", icon: Search },
  feed: { label: "Feed", icon: Rss },
  library: { label: "Library", icon: Library },
}

export function TabBar({ state, emitter, navigateToTab, insets }: TabBarProps) {
  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {state.routes.map((route, index) => {
        const config = TABS[route.name]
        if (!config) return null
        const focused = state.index === index
        const tint = focused ? colors.accentText : colors.secondary
        const Icon = config.icon

        const onPress = () => {
          const event = emitter.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          })
          if (!focused && !event.defaultPrevented) navigateToTab(route.key)
        }

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={config.label}
            accessibilityState={{ selected: focused }}
            onPress={onPress}
            style={({ pressed }) => [styles.tab, pressedStyle(pressed)]}
          >
            <Icon
              size={sizes.tabIcon}
              strokeWidth={1.75}
              color={tint}
              fill={focused ? tint : "none"}
            />
            <AppText variant="micro" numberOfLines={1} style={{ color: tint }}>
              {config.label}
            </AppText>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: colors.tabBar,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  tab: {
    flex: 1,
    height: sizes.tabBarContent,
    minHeight: sizes.minTouch,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
})
