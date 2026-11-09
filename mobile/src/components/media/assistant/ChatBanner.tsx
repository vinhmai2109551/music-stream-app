import { CircleAlert, X } from "lucide-react-native"
import { useEffect } from "react"
import { AccessibilityInfo, View } from "react-native"
import { AppText } from "@/components/ui/AppText"
import { IconButton } from "@/components/ui/IconButton"
import { copy } from "@/constants/copy"
import { makeStyles, radius, sizes, spacing, useColors } from "@/theme"

type ChatBannerProps = {
  message: string
  onDismiss: () => void
}

/** Says what went wrong with the last message, above the box where the person writes the next one. */
export function ChatBanner({ message, onDismiss }: ChatBannerProps) {
  const styles = useStyles()
  const colors = useColors()

  // Android reads the live region; iOS needs an explicit announcement.
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(message)
  }, [message])

  return (
    <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.banner}>
      <CircleAlert size={sizes.iconMd} color={colors.like} />
      <AppText variant="caption" style={styles.text}>
        {message}
      </AppText>
      <IconButton icon={X} label={copy.assistant.dismiss} size={sizes.iconMd} onPress={onDismiss} />
    </View>
  )
}

const useStyles = makeStyles((colors) => ({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    paddingLeft: spacing.md,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
  },
  text: { flex: 1, minWidth: 0, paddingVertical: spacing.md },
}))
