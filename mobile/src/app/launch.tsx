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

export default function LaunchScreen() {
  const insets = useSafeAreaInsets()
  const start = useAppStore((state) => state.start)

  return (
    <View style={styles.container}>
      <Image source={images.onboarding.launch} contentFit="cover" style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={[colors.heroScrimTop, colors.heroScrimMid, colors.heroScrimBottom]}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View
        entering={FadeInDown.duration(ENTER_DURATION)}
        style={[
          styles.content,
          {
            paddingTop: insets.top + spacing.giant + spacing.xl,
            paddingBottom: insets.bottom + spacing.xxl,
          },
        ]}
      >
        <BlurView intensity={BLUR_INTENSITY} tint="light" style={styles.logo}>
          <Music2 size={sizes.logoIcon} strokeWidth={2} color={colors.white} />
        </BlurView>
        <AppText variant="display" color="white" style={styles.headline}>
          {copy.launchHeadline.replace(", ", ",\n")}
        </AppText>
        <View style={styles.actions}>
          <Button label="Create an account" onPress={() => start("register")} />
          <Button
            label="I already have an account"
            variant="glass"
            onPress={() => start("login")}
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
    alignItems: "center",
    paddingHorizontal: spacing.screen,
  },
  logo: {
    width: sizes.logo,
    height: sizes.logo,
    borderRadius: radius.pill,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.glass,
  },
  headline: { marginTop: "auto", textAlign: "center" },
  actions: { width: "100%", gap: spacing.md, marginTop: spacing.giant + spacing.lg },
})
