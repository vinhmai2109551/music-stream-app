import { StyleSheet, View } from "react-native"
import { Skeleton } from "@/components/ui/Skeleton"
import { sizes, spacing } from "@/theme"

export function HomeSkeleton() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Skeleton width={160} height={sizes.giantSkeleton} />
        <Skeleton width={sizes.minTouch} height={sizes.minTouch} rounded={sizes.minTouch} />
      </View>
      <Skeleton height={sizes.searchBarHeight} rounded={sizes.searchBarHeight} />
      <Skeleton height={sizes.suggestionHeight} />
      <View style={styles.row}>
        <Skeleton width={sizes.chartCard} height={sizes.chartCard} />
        <Skeleton width={sizes.chartCard} height={sizes.chartCard} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: spacing.xxl, paddingHorizontal: spacing.screen },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  row: { flexDirection: "row", gap: spacing.md },
})
