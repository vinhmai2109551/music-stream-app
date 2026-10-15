import { CircleAlert } from "lucide-react-native"
import { StyleSheet, View } from "react-native"
import { colors, radius, sizes, spacing } from "@/theme"
import { AppText } from "./AppText"

type FormErrorProps = {
  message: string
}

/** Error that belongs to the whole form (e.g. coming from the server). */
export function FormError({ message }: FormErrorProps) {
  return (
    <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.container}>
      <CircleAlert size={sizes.iconMd} color={colors.like} />
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
    borderRadius: radius.cover,
    borderWidth: 1,
    borderColor: colors.like,
    backgroundColor: colors.glass,
  },
  text: { flex: 1 },
})
