import { Image } from "expo-image"
import { StyleSheet, View } from "react-native"
import { AppText } from "@/components/ui/AppText"
import { BottomSheet } from "@/components/ui/BottomSheet"
import { Button } from "@/components/ui/Button"
import { copy } from "@/constants/copy"
import { images } from "@/data/images"
import { radius, sizes, spacing } from "@/theme"

type AccountSheetProps = {
  visible: boolean
  onClose: () => void
  name: string
  email: string
  avatarUrl: string | null
  onLogout: () => void
}

/** Who is signed in, and the way out. */
export function AccountSheet({
  visible,
  onClose,
  name,
  email,
  avatarUrl,
  onLogout,
}: AccountSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title={copy.account.title}>
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
      <Button
        label={copy.auth.logout}
        variant="secondary"
        onPress={() => {
          onClose()
          onLogout()
        }}
      />
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
})
