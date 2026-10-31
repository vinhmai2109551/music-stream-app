import { router } from "expo-router"
import { LinearGradient } from "expo-linear-gradient"
import { useState } from "react"
import {
  FlatList,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { subscribe } from "@/api/users"
import { PlanCard } from "@/components/media/PlanCard"
import { AppText } from "@/components/ui/AppText"
import { pressedStyle } from "@/components/ui/pressed"
import { copy } from "@/constants/copy"
import { PREMIUM_PLANS, type PremiumPlan } from "@/constants/premium"
import { useAuthStore } from "@/store/authStore"
import { showToast } from "@/store/toastStore"
import { colors, radius, sizes, spacing } from "@/theme"
import { describeApiError } from "@/utils/apiErrors"

const CARD_WIDTH_RATIO = 0.8
const DOT_SIZE = 8

/** "Subscription Plans": swipe through the plans and start Premium (there is no payment). */
export default function PremiumScreen() {
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const isPremium = useAuthStore((state) => state.user?.isPremium ?? false)
  const setUser = useAuthStore((state) => state.setUser)
  const [page, setPage] = useState(0)
  const [subscribing, setSubscribing] = useState<string | null>(null)

  const cardWidth = Math.round(width * CARD_WIDTH_RATIO)
  const step = cardWidth + spacing.md

  const onSubscribe = async (plan: PremiumPlan) => {
    if (subscribing) return
    setSubscribing(plan.id)
    try {
      await setUser(await subscribe())
      router.replace("/premium-welcome")
    } catch (error) {
      showToast(`${copy.premium.subscribeFailed} ${describeApiError(error)}`)
      setSubscribing(null)
    }
  }

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / step)
    setPage(Math.min(Math.max(index, 0), PREMIUM_PLANS.length - 1))
  }

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={[colors.premiumStart, colors.premiumEnd]}
        start={{ x: 0.35, y: 0.25 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          styles.content,
          { paddingTop: insets.top + spacing.giant, paddingBottom: insets.bottom + spacing.xxl },
        ]}
      >
        <AppText variant="h1" color="white" accessibilityRole="header" style={styles.title}>
          {copy.premium.plansTitle}
        </AppText>
        <FlatList
          horizontal
          data={PREMIUM_PLANS}
          keyExtractor={(plan) => plan.id}
          showsHorizontalScrollIndicator={false}
          snapToInterval={step}
          snapToAlignment="start"
          decelerationRate="fast"
          onMomentumScrollEnd={onScrollEnd}
          style={styles.plans}
          contentContainerStyle={{ paddingHorizontal: (width - cardWidth) / 2, gap: spacing.md }}
          renderItem={({ item }) => (
            <PlanCard
              plan={item}
              width={cardWidth}
              subscribed={isPremium}
              loading={subscribing === item.id}
              onSubscribe={(plan) => void onSubscribe(plan)}
            />
          )}
        />
        <View accessibilityElementsHidden style={styles.dots}>
          {PREMIUM_PLANS.map((plan, index) => (
            <View key={plan.id} style={[styles.dot, index === page && styles.dotActive]} />
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.back, pressedStyle(pressed)]}
        >
          <AppText variant="bodyMedium" color="white">
            {copy.premium.backHome}
          </AppText>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.premiumStart },
  content: { flex: 1, justifyContent: "space-between" },
  title: { textAlign: "center", paddingHorizontal: spacing.screen },
  plans: { flexGrow: 0 },
  dots: { flexDirection: "row", justifyContent: "center", gap: spacing.sm },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: radius.pill,
    backgroundColor: colors.onDarkFaint,
  },
  dotActive: { backgroundColor: colors.white },
  back: { minHeight: sizes.minTouch, alignItems: "center", justifyContent: "center" },
})
