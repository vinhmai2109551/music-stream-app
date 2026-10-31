import { Check } from "lucide-react-native"
import { memo } from "react"
import { StyleSheet, View } from "react-native"
import { AppText } from "@/components/ui/AppText"
import { Button } from "@/components/ui/Button"
import { copy } from "@/constants/copy"
import type { PremiumPlan } from "@/constants/premium"
import { colors, radius, shadows, sizes, spacing } from "@/theme"

type PlanCardProps = {
  plan: PremiumPlan
  width: number
  /** The user already has Premium: the button only tells so. */
  subscribed: boolean
  /** This plan's request is running. */
  loading: boolean
  onSubscribe: (plan: PremiumPlan) => void
}

/** One subscription plan: name, price, what it includes and the button to start it. */
function PlanCardBase({ plan, width, subscribed, loading, onSubscribe }: PlanCardProps) {
  return (
    <View style={[styles.card, { width }]}>
      <AppText variant="h2" numberOfLines={1} ellipsizeMode="tail">
        {plan.name}
      </AppText>
      <View style={styles.priceRow}>
        <View style={styles.pill}>
          <AppText variant="small" color="premiumText" numberOfLines={1}>
            {plan.trial}
          </AppText>
        </View>
        <AppText variant="subtitle" numberOfLines={1} style={styles.price}>
          {plan.price}/ month
        </AppText>
      </View>
      <View style={styles.features}>
        {plan.features.map((feature) => (
          <View key={feature} style={styles.feature}>
            <Check size={sizes.iconMd} strokeWidth={2} color={colors.premiumCheck} />
            <AppText variant="body" color="secondary" style={styles.featureText}>
              {feature}
            </AppText>
          </View>
        ))}
      </View>
      <Button
        label={subscribed ? copy.premium.currentPlan : copy.premium.subscribe}
        variant="dark"
        loading={loading}
        disabled={subscribed}
        onPress={() => onSubscribe(plan)}
      />
    </View>
  )
}

export const PlanCard = memo(PlanCardBase)

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
    padding: spacing.xxl,
    borderRadius: radius.cover,
    backgroundColor: colors.white,
    ...shadows.card,
  },
  priceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.premiumTint,
  },
  price: { flexShrink: 0 },
  features: { gap: spacing.md, marginVertical: spacing.sm },
  feature: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  featureText: { flex: 1 },
})
