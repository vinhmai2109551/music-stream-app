import { Check } from "lucide-react-native"
import { memo } from "react"
import { Pressable, View } from "react-native"
import { AppText } from "@/components/ui/AppText"
import { Button } from "@/components/ui/Button"
import { pressedStyle } from "@/components/ui/pressed"
import { APP_LANGUAGES, LANGUAGE_NAMES, useTranslation, type AppLanguage } from "@/i18n"
import { useLanguageStore } from "@/store/languageStore"
import { makeStyles, radius, sizes, spacing, useColors } from "@/theme"

type OptionProps = {
  label: string
  hint?: string
  selected: boolean
  onPress: () => void
}

const Option = memo(function Option({ label, hint, selected, onPress }: OptionProps) {
  const styles = useStyles()
  const colors = useColors()

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={hint ? `${label}. ${hint}` : label}
      onPress={onPress}
      style={({ pressed }) => [styles.option, selected && styles.selected, pressedStyle(pressed)]}
    >
      <View style={styles.text}>
        <AppText variant="bodyMedium" numberOfLines={1} ellipsizeMode="tail">
          {label}
        </AppText>
        {hint ? (
          <AppText variant="small" color="secondary" numberOfLines={2}>
            {hint}
          </AppText>
        ) : null}
      </View>
      {selected && <Check size={sizes.iconMd} strokeWidth={2.5} color={colors.accentText} />}
    </Pressable>
  )
})

type LanguagePickerProps = {
  onDone: () => void
}

/** The language of the app: the phone's own, or one of the five. The whole app changes at once. */
export function LanguagePicker({ onDone }: LanguagePickerProps) {
  const { t } = useTranslation()
  const styles = useStyles()
  const choice = useLanguageStore((state) => state.choice)
  const setChoice = useLanguageStore((state) => state.setChoice)

  const choose = (language: AppLanguage | null) => () => setChoice(language)

  return (
    <View style={styles.container}>
      <View accessibilityRole="radiogroup" style={styles.list}>
        <Option
          label={t("settings.language.system")}
          hint={t("settings.language.systemHint")}
          selected={choice === null}
          onPress={choose(null)}
        />
        {APP_LANGUAGES.map((language) => (
          <Option
            key={language}
            label={LANGUAGE_NAMES[language]}
            selected={choice === language}
            onPress={choose(language)}
          />
        ))}
      </View>
      <Button label={t("common.back")} variant="text" onPress={onDone} />
    </View>
  )
}

const useStyles = makeStyles((colors) => ({
  container: { gap: spacing.md, paddingVertical: spacing.md },
  list: { gap: spacing.sm },
  option: {
    minHeight: sizes.minTouch,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: sizes.borderThin,
    borderColor: "transparent",
  },
  selected: { borderColor: colors.accentText },
  text: { flex: 1, minWidth: 0 },
}))
