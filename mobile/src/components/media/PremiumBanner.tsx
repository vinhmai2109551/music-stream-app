import { LinearGradient } from "expo-linear-gradient"
import { Crown } from "lucide-react-native"
import { Pressable, StyleSheet, View } from "react-native"
import { AppText } from "@/components/ui/AppText"
import { pressedStyle } from "@/components/ui/pressed"
import { colors, radius, shadows, sizes, spacing } from "@/theme"

type PremiumBannerProps = {
  onPress: () => void
}

export function PremiumBanner({ onPress }: PremiumBannerProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Unlock Music Stream Premium"
      onPress={onPress}
      style={({ pressed }) => [styles.wrapper, pressedStyle(pressed)]}
    >
      <LinearGradient
        colors={colors.chartGradients.violet}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.banner}
      >
        <View style={styles.icon}>
          <Crown size={sizes.icon} color={colors.white} />
        </View>
        <View style={styles.text}>
          <AppText variant="subtitle" color="white" numberOfLines={1} ellipsizeMode="tail">
            Unlock Music Stream Premium
          </AppText>
          <AppText variant="small" color="onDarkMuted" numberOfLines={1} ellipsizeMode="tail">
            One month free · Cancel anytime
          </AppText>
        </View>
      </LinearGradient>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  wrapper: { borderRadius: radius.card, ...shadows.card },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.card,
  },
  icon: {
    width: sizes.minTouch,
    height: sizes.minTouch,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.onDarkFaint,
  },
  text: { flex: 1, minWidth: 0 },
})
