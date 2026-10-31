import { Tabs } from "expo-router"
import { View } from "react-native"
import { MiniPlayer } from "@/components/media/MiniPlayer"
import { TabBar } from "@/components/ui/TabBar"
import { colors } from "@/theme"

export default function TabsLayout() {
  return (
    <Tabs
      backBehavior="history"
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}
      tabBar={(props) => (
        <View style={{ backgroundColor: colors.background }}>
          <MiniPlayer />
          <TabBar {...props} />
        </View>
      )}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="feed" />
      <Tabs.Screen name="library" />
      {/* Not a tab: the tab bar only draws the routes it knows, and this one sits under Library. */}
      <Tabs.Screen name="playlists" />
    </Tabs>
  )
}
