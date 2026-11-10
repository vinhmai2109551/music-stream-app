import { MonitorPlay } from "lucide-react-native"
import { StyleSheet, View } from "react-native"
import { AppText } from "@/components/ui/AppText"
import { colors, sizes, spacing } from "@/theme"
import { useTranslation } from "@/i18n"

/** Tells that the track plays from its official YouTube video. */
export function YouTubeLabel() {
  const { t } = useTranslation()

  return (
    <View style={styles.row}>
      <MonitorPlay size={sizes.iconSm} color={colors.onDarkMuted} />
      <AppText variant="small" color="onDarkMuted">
        {t("player.viaYoutube")}
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
