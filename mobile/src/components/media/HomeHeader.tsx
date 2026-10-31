import { Image } from "expo-image"
import { Bell } from "lucide-react-native"
import { Pressable, StyleSheet, View } from "react-native"
import { AppText } from "@/components/ui/AppText"
import { IconButton } from "@/components/ui/IconButton"
import { pressedStyle } from "@/components/ui/pressed"
import { copy } from "@/constants/copy"
import { images } from "@/data/images"
import { colors, radius, shadows, sizes, spacing } from "@/theme"
import { useGreeting } from "@/hooks/useGreeting"

type HomeHeaderProps = {
  /** Name of the signed-in user. */
  name: string
  avatarUrl: string | null
  onNotifications: () => void
  onAccount: () => void
}

export function HomeHeader({ name, avatarUrl, onNotifications, onAccount }: HomeHeaderProps) {
  const greeting = useGreeting()
  return (
    <View style={styles.row}>
      <View style={styles.greeting}>
        <AppText variant="caption" color="secondary">
          {greeting}
        </AppText>
        <AppText variant="h2" numberOfLines={1} ellipsizeMode="tail">
          {name}
        </AppText>
      </View>
      <View style={styles.actions}>
        <View>
          <IconButton icon={Bell} label="Notifications" onPress={onNotifications} />
          <View pointerEvents="none" style={styles.dot} />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.account.title}
          onPress={onAccount}
          style={({ pressed }) => [styles.avatarButton, pressedStyle(pressed)]}
        >
          <Image
            source={avatarUrl ?? images.user.avatar}
            contentFit="cover"
            style={styles.avatar}
          />
        </Pressable>
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
    borderWidth: sizes.borderThick,
    borderColor: colors.white,
    boxSizing: "content-box",
  },
  avatarButton: {
    width: sizes.minTouch,
    height: sizes.minTouch,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: sizes.userAvatar,
    height: sizes.userAvatar,
    borderRadius: radius.pill,
    borderWidth: sizes.borderThick,
    borderColor: colors.white,
    ...shadows.soft,
  },
})
