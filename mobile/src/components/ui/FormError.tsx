import { CircleAlert } from "lucide-react-native"
import { useEffect } from "react"
import { AccessibilityInfo, StyleSheet, View } from "react-native"
import { colors, radius, sizes, spacing } from "@/theme"
import { AppText } from "./AppText"

type FormErrorProps = {
  message: string
}

/** Error that belongs to the whole form (e.g. coming from the server). */
export function FormError({ message }: FormErrorProps) {
  // Android reads the live region; iOS needs an explicit announcement.
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(message)
  }, [message])

  return (
    <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.container}>
      <CircleAlert size={sizes.iconMd} color={colors.likeOnDark} />
      <AppText variant="caption" color="white" style={styles.text}>
        {message}
      </AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: sizes.borderThin,
    borderColor: colors.likeOnDark,
    backgroundColor: colors.glass,
  },
  text: { flex: 1 },
})
