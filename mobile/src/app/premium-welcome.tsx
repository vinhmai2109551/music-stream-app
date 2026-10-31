import { BlurView } from "expo-blur"
import { Image } from "expo-image"
import { LinearGradient } from "expo-linear-gradient"
import { router } from "expo-router"
import { Music2 } from "lucide-react-native"
import { StyleSheet, View } from "react-native"
import Animated, { FadeInDown } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { AppText } from "@/components/ui/AppText"
import { Button } from "@/components/ui/Button"
import { copy } from "@/constants/copy"
import { images } from "@/data/images"
import { colors, radius, sizes, spacing } from "@/theme"

const BLUR_INTENSITY = 30
const ENTER_DURATION = 500
const DOT_SIZE = 6

// Clear photo on top, darker behind the text.
const SCRIM_COLORS = [colors.heroScrimTop, colors.heroScrimMid, colors.playerScrim] as const
const SCRIM_LOCATIONS = [0, 0.45, 1] as const

/** "Premium Launch": shown right after Premium started. */
export default function PremiumWelcomeScreen() {
  const insets = useSafeAreaInsets()

  return (
    <View style={styles.container}>
      <Image
        source={images.onboarding.premium}
        contentFit="cover"
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={SCRIM_COLORS}
        locations={SCRIM_LOCATIONS}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View
        entering={FadeInDown.duration(ENTER_DURATION)}
        style={[
          styles.content,
          { paddingTop: insets.top + spacing.huge, paddingBottom: insets.bottom + spacing.xxl },
        ]}
      >
        <BlurView intensity={BLUR_INTENSITY} tint="light" style={styles.logo}>
          <Music2 size={sizes.logoIcon} strokeWidth={2} color={colors.white} />
        </BlurView>
        <View style={styles.block}>
          <AppText variant="h1" color="white" accessibilityRole="header" style={styles.title}>
            {copy.premium.welcomeTitle.replace("to ", "to\n")}
          </AppText>
          <View accessibilityElementsHidden style={styles.dots}>
            {[0, 1, 2].map((dot) => (
              <View key={dot} style={styles.dot} />
            ))}
          </View>
          <Button
            label={copy.premium.welcomeAction}
            variant="dark"
            onPress={() => router.dismissTo("/")}
          />
        </View>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.text },
  content: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: spacing.screen,
  },
  logo: {
    alignSelf: "center",
    width: sizes.logo,
    height: sizes.logo,
    borderRadius: radius.pill,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassBorder,
  },
  block: { gap: spacing.xxl },
  title: { textAlign: "center" },
  dots: { flexDirection: "row", justifyContent: "center", gap: spacing.sm },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
  },
})
