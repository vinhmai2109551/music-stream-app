import { Check, CircleAlert, Clock, Sparkles, X, type LucideIcon } from "lucide-react-native"
import { memo } from "react"
import { ActivityIndicator, View } from "react-native"
import { AppText } from "@/components/ui/AppText"
import { Button } from "@/components/ui/Button"
import { type ColorToken, makeStyles, radius, sizes, spacing, useColors } from "@/theme"
import type { ChatItem } from "@/utils/chatState"
import { ResultCards } from "./ResultCards"
import { useTranslation, type TranslationKey } from "@/i18n"

type ActionItem = Extract<ChatItem, { kind: "action" }>

type Outcome = { icon: LucideIcon; labelKey: TranslationKey; tint: ColorToken }

/** How a decided proposal is shown. The text stays in a readable colour; only the icon is tinted. */
const OUTCOMES: Partial<Record<ActionItem["status"], Outcome>> = {
  CONFIRMED: { icon: Check, labelKey: "assistant.action.confirmed", tint: "success" },
  REJECTED: { icon: X, labelKey: "assistant.action.rejected", tint: "secondary" },
  EXPIRED: { icon: Clock, labelKey: "assistant.action.expired", tint: "secondary" },
  FAILED: { icon: CircleAlert, labelKey: "assistant.action.failed", tint: "like" },
}

type ActionCardProps = {
  item: ActionItem
  /** Another answer is being written: the person has to wait before deciding. */
  locked: boolean
  onConfirm: (actionId: string) => void
  onReject: (actionId: string) => void
}

/** A change the assistant wants to make to the person's library. Nothing happens before "Đồng ý". */
function ActionCardBase({ item, locked, onConfirm, onReject }: ActionCardProps) {
  const { t } = useTranslation()

  const styles = useStyles()
  const colors = useColors()

  const outcome = OUTCOMES[item.status]
  return (
    <View style={styles.card}>
      <View style={styles.heading}>
        <Sparkles size={sizes.iconSm} strokeWidth={2} color={colors.accentText} />
        <AppText variant="caption" color="accentText">
          {t("assistant.action.heading")}
        </AppText>
      </View>
      <AppText variant="subtitle">{item.summary}</AppText>

      {item.status === "PENDING" && (
        <>
          <View style={styles.buttons}>
            <Button
              label={t("assistant.action.confirm")}
              disabled={locked}
              onPress={() => onConfirm(item.actionId)}
              style={styles.button}
            />
            <Button
              label={t("assistant.action.reject")}
              variant="tonal"
              disabled={locked}
              onPress={() => onReject(item.actionId)}
              style={styles.button}
            />
          </View>
          <AppText variant="small" color="secondary">
            {t("assistant.action.waiting")}
          </AppText>
        </>
      )}

      {item.status === "BUSY" && (
        <View
          accessible
          accessibilityLiveRegion="polite"
          accessibilityLabel={t("assistant.action.busy")}
          style={styles.status}
        >
          <ActivityIndicator size="small" color={colors.accentText} />
          <AppText variant="caption" color="secondary">
            {t("assistant.action.busy")}
          </AppText>
        </View>
      )}

      {outcome && (
        <View
          accessible
          accessibilityLiveRegion="polite"
          accessibilityLabel={t(outcome.labelKey)}
          style={styles.status}
        >
          <outcome.icon size={sizes.iconMd} strokeWidth={2} color={colors[outcome.tint]} />
          <AppText variant="caption">{t(outcome.labelKey)}</AppText>
        </View>
      )}

      {item.status === "CONFIRMED" && <ResultCards display={item.display} />}
    </View>
  )
}

export const ActionCard = memo(ActionCardBase)

const useStyles = makeStyles((colors) => ({
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.card,
    borderWidth: sizes.borderThin,
    borderColor: colors.accentText,
    backgroundColor: colors.accentFaint,
  },
  heading: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  buttons: { flexDirection: "row", gap: spacing.md },
  button: { flex: 1 },
  status: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
}))
