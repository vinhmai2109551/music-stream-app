import { CircleAlert } from "lucide-react-native"
import { View } from "react-native"
import { AppText } from "@/components/ui/AppText"
import { Button } from "@/components/ui/Button"
import { useTranslation } from "@/i18n"
import { makeStyles, radius, sizes, spacing, useColors } from "@/theme"

type LyricsNoticeProps = {
  message: string
  /** Offered only when trying again can help. */
  onRetry?: () => void
  onBack: () => void
}

/** Why the translation is not there; the original lyrics stay on screen under it. */
export function LyricsNotice({ message, onRetry, onBack }: LyricsNoticeProps) {
  const { t } = useTranslation()
  const styles = useStyles()
  const colors = useColors()

  return (
    <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.box}>
      <View style={styles.message}>
        <CircleAlert size={sizes.iconMd} strokeWidth={2} color={colors.accentText} />
        <AppText variant="caption" style={styles.text}>
          {message}
        </AppText>
      </View>
      <View style={styles.actions}>
        {onRetry && <Button label={t("common.retry")} variant="tonal" onPress={onRetry} />}
        <Button label={t("lyrics.viewOriginal")} variant="text" onPress={onBack} />
      </View>
    </View>
  )
}

const useStyles = makeStyles((colors) => ({
  box: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
  },
  message: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  text: { flex: 1, minWidth: 0 },
  actions: { gap: spacing.sm },
}))
