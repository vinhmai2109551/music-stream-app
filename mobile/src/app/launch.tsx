import { LinearGradient } from "expo-linear-gradient"
import { BlurView } from "expo-blur"
import { Image } from "expo-image"
import { Music2 } from "lucide-react-native"
import { StyleSheet, View } from "react-native"
import Animated, { FadeInDown } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { AppText } from "@/components/ui/AppText"
import { Button } from "@/components/ui/Button"
import { copy } from "@/constants/copy"
import { images } from "@/data/images"
import { useAppStore } from "@/store/appStore"
import { colors, radius, sizes, spacing } from "@/theme"

const BLUR_INTENSITY = 30
const ENTER_DURATION = 500

// Clear photo in the upper half, near-black behind the text block.
const SCRIM_COLORS = [
  colors.heroScrimTop,
  colors.heroScrimMid,
  colors.playerScrim,
  colors.scrimDeep,
] as const
const SCRIM_LOCATIONS = [0, 0.38, 0.6, 0.85] as const

export default function LaunchScreen() {
  const insets = useSafeAreaInsets()
  const start = useAppStore((state) => state.start)

  return (
    <View style={styles.container}>
      <Image source={images.onboarding.launch} contentFit="cover" style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={SCRIM_COLORS}
        locations={SCRIM_LOCATIONS}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View
        entering={FadeInDown.duration(ENTER_DURATION)}
        style={[
          styles.content,
          {
            paddingTop: insets.top + spacing.xxxl,
            paddingBottom: insets.bottom + spacing.xxl,
          },
        ]}
      >
        <BlurView intensity={BLUR_INTENSITY} tint="light" style={styles.logo}>
          <Music2 size={sizes.logoIcon} strokeWidth={2} color={colors.white} />
        </BlurView>
        <View style={styles.block}>
          <View style={styles.copyBlock}>
            <AppText variant="display" color="white" accessibilityRole="header" numberOfLines={2}>
              {copy.launchHeadline.replace(", ", ",\n")}
            </AppText>
            <AppText color="onDarkMuted" numberOfLines={3} ellipsizeMode="tail">
              {copy.launchSubtitle}
            </AppText>
          </View>
          <View style={styles.actions}>
            <Button label="Create an account" onPress={() => start("register")} />
            <Button
              label="I already have an account"
              variant="glass"
              onPress={() => start("login")}
            />
          </View>
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
    alignSelf: "flex-start",
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
  block: { gap: spacing.xxxl },
  copyBlock: { gap: spacing.md },
  actions: { gap: spacing.md },
})
