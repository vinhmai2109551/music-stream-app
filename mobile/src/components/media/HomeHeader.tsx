import { Image } from "expo-image"
import { Bell, LogOut } from "lucide-react-native"
import { StyleSheet, View } from "react-native"
import { AppText } from "@/components/ui/AppText"
import { IconButton } from "@/components/ui/IconButton"
import { copy } from "@/constants/copy"
import { images } from "@/data/images"
import { colors, radius, sizes, spacing } from "@/theme"

type HomeHeaderProps = {
  /** Name of the signed-in user. */
  name: string
  avatarUrl: string | null
  onNotifications: () => void
  onLogout: () => void
}

export function HomeHeader({ name, avatarUrl, onNotifications, onLogout }: HomeHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.greeting}>
        <AppText variant="caption" color="secondary">
          {copy.greeting}
        </AppText>
        <AppText variant="h2" numberOfLines={1} ellipsizeMode="tail">
          {name}
        </AppText>
      </View>
      <View style={styles.actions}>
        {/* Temporary: lets you test the auth flow until the profile screen exists. */}
        <IconButton icon={LogOut} label={copy.auth.logout} onPress={onLogout} />
        <View>
          <IconButton icon={Bell} label="Notifications" onPress={onNotifications} />
          <View pointerEvents="none" style={styles.dot} />
        </View>
        <Image source={avatarUrl ?? images.user.avatar} contentFit="cover" style={styles.avatar} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  greeting: { flex: 1, minWidth: 0 },
  actions: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  dot: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    width: sizes.notificationDot,
    height: sizes.notificationDot,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.white,
    boxSizing: "content-box",
  },
  avatar: { width: sizes.userAvatar, height: sizes.userAvatar, borderRadius: radius.pill },
})
