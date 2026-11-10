import { Languages } from "lucide-react-native"
import { ScrollView, View } from "react-native"
import { AppText } from "@/components/ui/AppText"
import { Chip } from "@/components/ui/Chip"
import { useTranslation, type TranslationKey } from "@/i18n"
import { makeStyles, sizes, spacing, useColors } from "@/theme"
import type { LyricsView } from "./LyricLines"

const VIEWS: readonly { view: LyricsView; labelKey: TranslationKey }[] = [
  { view: "original", labelKey: "lyrics.viewOriginal" },
  { view: "parallel", labelKey: "lyrics.viewParallel" },
  { view: "translation", labelKey: "lyrics.viewTranslation" },
]

type LyricsViewChipsProps = {
  view: LyricsView
  onChange: (view: LyricsView) => void
}

/** Original only, each line with its translation, or the translation only. */
export function LyricsViewChips({ view, onChange }: LyricsViewChipsProps) {
  const { t } = useTranslation()
  const styles = useStyles()

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityLabel={t("lyrics.viewLabel")}
      contentContainerStyle={styles.chips}
    >
      {VIEWS.map((item) => (
        <Chip
          key={item.view}
          label={t(item.labelKey)}
          selected={item.view === view}
          onPress={() => onChange(item.view)}
        />
      ))}
    </ScrollView>
  )
}

/** Tells that the text under it was translated by a machine. */
export function AutoTranslatedLabel() {
  const { t } = useTranslation()
  const styles = useStyles()
  const colors = useColors()

  return (
    <View style={styles.label}>
      <Languages size={sizes.iconSm} strokeWidth={2} color={colors.secondary} />
      <AppText variant="small" color="secondary">
        {t("lyrics.autoTranslated")}
      </AppText>
    </View>
  )
}

/** Where the text comes from ("demo" is said in words). */
export function LyricsSource({ source }: { source: string }) {
  const { t } = useTranslation()

  const name = source === "demo" ? t("lyrics.sourceDemo") : source
  return (
    <AppText variant="small" color="secondary">
      {t("lyrics.sourceLabel", { source: name })}
    </AppText>
  )
}

const useStyles = makeStyles(() => ({
  chips: { gap: spacing.sm, paddingVertical: spacing.xs },
  label: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
}))
