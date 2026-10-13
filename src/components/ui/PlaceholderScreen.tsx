import type { ReactNode } from "react"
import { StyleSheet, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { colors, spacing } from "@/theme"
import { AppText } from "./AppText"

type PlaceholderScreenProps = {
  title: string
  note?: string
  children?: ReactNode
}

/** Temporary screen body used until the real screen is built in a later epic. */
export function PlaceholderScreen({ title, note, children }: PlaceholderScreenProps) {
  const insets = useSafeAreaInsets()
  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.xl }]}>
      <AppText variant="h2">{title}</AppText>
      {note && (
        <AppText color="secondary" style={styles.note}>
          {note}
        </AppText>
      )}
      {children && <View style={styles.actions}>{children}</View>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: spacing.screen,
    backgroundColor: colors.background,
  },
  note: { marginTop: spacing.sm, textAlign: "center" },
  actions: { marginTop: spacing.xxl, gap: spacing.md },
})
