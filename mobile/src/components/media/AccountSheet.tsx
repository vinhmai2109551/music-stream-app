import { Image } from "expo-image"
import { router } from "expo-router"
import { useState } from "react"
import { StyleSheet, View } from "react-native"
import { AppText } from "@/components/ui/AppText"
import { BottomSheet } from "@/components/ui/BottomSheet"
import { Button } from "@/components/ui/Button"
import { copy } from "@/constants/copy"
import { images } from "@/data/images"
import { useAssistantStore } from "@/store/assistantStore"
import { radius, sizes, spacing } from "@/theme"
import { EditProfileForm } from "./EditProfileForm"

/** A little longer than the sheet takes to slide away (BottomSheet: 200 ms). */
const SHEET_CLOSE_MS = 300

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
  // The form lives in this sheet (not in a second one): two modals cannot be swapped reliably on iOS.
  const [editing, setEditing] = useState(false)
  const assistantOn = useAssistantStore((store) => store.availability !== "unavailable")

  const close = () => {
    setEditing(false)
    onClose()
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={close}
      title={editing ? copy.account.edit.title : copy.account.title}
    >
      {editing ? (
        <EditProfileForm onDone={() => setEditing(false)} />
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
                label={copy.assistant.open}
                variant="tonal"
                onPress={() => {
                  close()
                  // Wait until the sheet is gone: a screen pushed while a modal closes can be lost on iOS.
                  setTimeout(() => router.push("/assistant"), SHEET_CLOSE_MS)
                }}
              />
            )}
            <Button
              label={copy.account.editProfile}
              variant="tonal"
              onPress={() => setEditing(true)}
            />
            <Button
              label={copy.auth.logout}
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
