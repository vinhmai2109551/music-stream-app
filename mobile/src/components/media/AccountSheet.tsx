import { Image } from "expo-image"
import { router } from "expo-router"
import { useState } from "react"
import { StyleSheet, View } from "react-native"
import { AppText } from "@/components/ui/AppText"
import { BottomSheet } from "@/components/ui/BottomSheet"
import { Button } from "@/components/ui/Button"
import { images } from "@/data/images"
import { LANGUAGE_NAMES, useTranslation, type TranslationKey } from "@/i18n"
import { useAssistantStore } from "@/store/assistantStore"
import { useLanguageStore } from "@/store/languageStore"
import { radius, sizes, spacing } from "@/theme"
import { EditProfileForm } from "./EditProfileForm"
import { LanguagePicker } from "./LanguagePicker"

/** A little longer than the sheet takes to slide away (BottomSheet: 200 ms). */
const SHEET_CLOSE_MS = 300

type SheetView = "main" | "edit" | "language"

const TITLES: Record<SheetView, TranslationKey> = {
  main: "settings.title",
  edit: "settings.edit.title",
  language: "settings.language.title",
}

type AccountSheetProps = {
  visible: boolean
  onClose: () => void
  name: string
  email: string
  avatarUrl: string | null
  onLogout: () => void
}

/** Who is signed in, the way to edit the profile, and the way out. */
export function AccountSheet({
  visible,
  onClose,
  name,
  email,
  avatarUrl,
  onLogout,
}: AccountSheetProps) {
  const { t } = useTranslation()

  // The form and the language list live in this sheet (not in a second one): two modals cannot be
  // swapped reliably on iOS.
  const [view, setView] = useState<SheetView>("main")
  const assistantOn = useAssistantStore((store) => store.availability !== "unavailable")
  const language = useLanguageStore((store) => store.choice)

  const close = () => {
    setView("main")
    onClose()
  }
  const back = () => setView("main")

  return (
    <BottomSheet visible={visible} onClose={close} title={t(TITLES[view])}>
      {view === "edit" ? (
        <EditProfileForm onDone={back} />
      ) : view === "language" ? (
        <LanguagePicker onDone={back} />
      ) : (
        <>
          <View style={styles.profile}>
            <Image
              source={avatarUrl ?? images.user.avatar}
              contentFit="cover"
              accessible={false}
              style={styles.avatar}
            />
            <View style={styles.text}>
              <AppText variant="title" numberOfLines={1} ellipsizeMode="tail">
                {name}
              </AppText>
              <AppText variant="caption" color="secondary" numberOfLines={1} ellipsizeMode="tail">
                {email}
              </AppText>
            </View>
          </View>
          <View style={styles.actions}>
            {assistantOn && (
              <Button
                label={t("assistant.open")}
                variant="tonal"
                onPress={() => {
                  close()
                  // Wait until the sheet is gone: a screen pushed while a modal closes can be lost on iOS.
                  setTimeout(() => router.push("/assistant"), SHEET_CLOSE_MS)
                }}
              />
            )}
            <Button
              label={t("settings.editProfile")}
              variant="tonal"
              onPress={() => setView("edit")}
            />
            <Button
              label={`${t("settings.language.title")}: ${
                language ? LANGUAGE_NAMES[language] : t("settings.language.system")
              }`}
              variant="tonal"
              onPress={() => setView("language")}
            />
            <Button
              label={t("auth.logout")}
              variant="secondary"
              onPress={() => {
                close()
                onLogout()
              }}
            />
          </View>
        </>
      )}
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  profile: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    paddingVertical: spacing.xl,
  },
  avatar: { width: sizes.coverMd, height: sizes.coverMd, borderRadius: radius.pill },
  text: { flex: 1, minWidth: 0 },
  actions: { gap: spacing.md },
})
