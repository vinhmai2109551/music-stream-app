import { MonitorPlay } from "lucide-react-native"
import { StyleSheet, View } from "react-native"
import { AppText } from "@/components/ui/AppText"
import { copy } from "@/constants/copy"
import { colors, sizes, spacing } from "@/theme"

/** Tells that the track plays from its official YouTube video. */
export function YouTubeLabel() {
  return (
    <View style={styles.row}>
      <MonitorPlay size={sizes.iconSm} color={colors.onDarkMuted} />
      <AppText variant="small" color="onDarkMuted">
        {copy.player.viaYoutube}
      </AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
})
