import { StyleSheet, View } from "react-native"
import { Skeleton } from "@/components/ui/Skeleton"
import { sizes, spacing } from "@/theme"

/** Placeholder for the sections of Home; the header, search and region chips stay on screen. */
export function HomeSkeleton() {
  return (
    <View style={styles.container}>
      <Skeleton height={sizes.suggestionHeight} />
      <View style={styles.row}>
        <Skeleton width={sizes.chartCard} height={sizes.chartCard} />
        <Skeleton width={sizes.chartCard} height={sizes.chartCard} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: spacing.xxl, marginTop: spacing.xxl, paddingHorizontal: spacing.screen },
  row: { flexDirection: "row", gap: spacing.md },
})
