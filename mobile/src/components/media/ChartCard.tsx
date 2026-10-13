import { LinearGradient } from "expo-linear-gradient"
import { memo } from "react"
import { Pressable, StyleSheet } from "react-native"
import { AppText } from "@/components/ui/AppText"
import { pressedStyle } from "@/components/ui/pressed"
import { radius, shadows, sizes, spacing } from "@/theme"
import type { ChartItem } from "@/types"

type ChartCardProps = {
  chart: ChartItem
  onPress: (playlistId: string) => void
}

function ChartCardBase({ chart, onPress }: ChartCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${chart.title} ${chart.country}`}
      onPress={() => onPress(chart.id)}
      style={({ pressed }) => [styles.card, pressedStyle(pressed)]}
    >
      <LinearGradient
        colors={chart.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cover}
      >
        <AppText variant="title" color="white">
          {chart.title}
        </AppText>
        <AppText variant="caption" color="white" style={styles.country}>
          {chart.country}
        </AppText>
      </LinearGradient>
      <AppText variant="small" color="secondary" numberOfLines={2} style={styles.description}>
        {chart.description}
      </AppText>
    </Pressable>
  )
}

export const ChartCard = memo(ChartCardBase)

const styles = StyleSheet.create({
  card: { width: sizes.chartCard },
  cover: {
    width: sizes.chartCard,
    height: sizes.chartCard,
    borderRadius: radius.card,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.card,
  },
  country: { marginTop: spacing.lg },
  description: { marginTop: spacing.sm },
})
