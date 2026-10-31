import { Search, type LucideIcon } from "lucide-react-native"
import type { ReactNode } from "react"
import { StyleSheet, View } from "react-native"
import { colors, radius, spacing } from "@/theme"
import { AppText } from "./AppText"

const ICON_SIZE = 40
const BADGE_SIZE = 96

type EmptyStateProps = {
  title: string
  description: string
  icon?: LucideIcon
  action?: ReactNode
}

export function EmptyState({ title, description, icon: Icon = Search, action }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Icon size={ICON_SIZE} strokeWidth={1.5} color={colors.accentText} />
      </View>
      <AppText variant="title" style={styles.center}>
        {title}
      </AppText>
      <AppText variant="body" color="secondary" style={[styles.center, styles.description]}>
        {description}
      </AppText>
      {action && <View style={styles.action}>{action}</View>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingHorizontal: spacing.xxxl,
    paddingVertical: spacing.giant,
  },
  badge: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentSoft,
    marginBottom: spacing.xl,
  },
  center: { textAlign: "center" },
  description: { marginTop: spacing.sm },
  action: { marginTop: spacing.xl },
})
