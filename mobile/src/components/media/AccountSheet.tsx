import { Image } from "expo-image"
import { useState } from "react"
import { StyleSheet, View } from "react-native"
import { AppText } from "@/components/ui/AppText"
import { BottomSheet } from "@/components/ui/BottomSheet"
import { Button } from "@/components/ui/Button"
import { copy } from "@/constants/copy"
import { images } from "@/data/images"
import { radius, sizes, spacing } from "@/theme"
import { EditProfileForm } from "./EditProfileForm"

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
