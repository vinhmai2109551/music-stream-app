import { router } from "expo-router"
import { ChevronLeft } from "lucide-react-native"
import { StyleSheet, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { colors, sizes, spacing } from "@/theme"
import { AppText } from "./AppText"
import { IconButton } from "./IconButton"

type TopBarProps = {
  title?: string
}

/** Back button + optional title for pushed screens. Respects the top safe area. */
export function TopBar({ title }: TopBarProps) {
  const insets = useSafeAreaInsets()
  return (
    <View style={[styles.bar, { paddingTop: insets.top, height: insets.top + sizes.topBarHeight }]}>
      <IconButton icon={ChevronLeft} label="Back" color="text" onPress={() => router.back()} />
      {title !== undefined && (
        <AppText variant="subtitle" numberOfLines={1} ellipsizeMode="tail" style={styles.title}>
          {title}
        </AppText>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.background,
  },
  title: { flex: 1, marginLeft: spacing.xs },
})
