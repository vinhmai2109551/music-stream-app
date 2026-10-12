import { StyleSheet, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { AppText } from "@/components/ui/AppText"
import { copy } from "@/constants/copy"
import { colors, spacing } from "@/theme"

/** Temporary entry screen; replaced by the Launch screen in the Navigation epic. */
export default function Index() {
  const insets = useSafeAreaInsets()
  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <AppText variant="h1" style={styles.title}>
        {copy.appName}
      </AppText>
      <AppText color="secondary" style={styles.subtitle}>
        {copy.launchHeadline}
      </AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.screen,
    backgroundColor: colors.background,
  },
  title: { textAlign: "center" },
  subtitle: { marginTop: spacing.sm, textAlign: "center" },
})
