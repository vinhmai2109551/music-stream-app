import { Image } from "expo-image"
import { LinearGradient } from "expo-linear-gradient"
import { memo } from "react"
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native"
import { AppText } from "@/components/ui/AppText"
import { pressedStyle } from "@/components/ui/pressed"
import { colors, radius, shadows, sizes, spacing } from "@/theme"
import type { Suggestion } from "@/types"

const WIDTH_RATIO = 0.72

type SuggestionCardProps = {
  suggestion: Suggestion
  onPress: (suggestion: Suggestion) => void
}

function SuggestionCardBase({ suggestion, onPress }: SuggestionCardProps) {
  const { width } = useWindowDimensions()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${suggestion.title} by ${suggestion.subtitle}`}
      onPress={() => onPress(suggestion)}
      style={({ pressed }) => [styles.card, { width: width * WIDTH_RATIO }, pressedStyle(pressed)]}
    >
      <Image source={suggestion.image} contentFit="cover" style={StyleSheet.absoluteFill} />
      <LinearGradient colors={[colors.transparent, colors.cardScrim]} style={styles.scrim}>
        <View>
          <AppText variant="subtitle" color="white" numberOfLines={1} ellipsizeMode="tail">
            {suggestion.title}
          </AppText>
          <AppText variant="small" color="onDarkMuted" numberOfLines={1} ellipsizeMode="tail">
            {suggestion.subtitle}
          </AppText>
        </View>
      </LinearGradient>
    </Pressable>
  )
}

export const SuggestionCard = memo(SuggestionCardBase)

const styles = StyleSheet.create({
  card: {
    height: sizes.suggestionHeight,
    overflow: "hidden",
    borderRadius: radius.card,
    justifyContent: "flex-end",
    ...shadows.card,
  },
  scrim: { padding: spacing.lg, paddingTop: spacing.huge },
})
