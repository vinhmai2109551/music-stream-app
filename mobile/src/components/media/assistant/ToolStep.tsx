import { CircleAlert } from "lucide-react-native"
import { memo } from "react"
import { ActivityIndicator, View } from "react-native"
import type { ChatItem } from "@/utils/chatState"
import { AppText } from "@/components/ui/AppText"
import { copy } from "@/constants/copy"
import { makeStyles, sizes, spacing, useColors } from "@/theme"
import { ResultCards } from "./ResultCards"

type ToolItem = Extract<ChatItem, { kind: "tool" }>

const labels: Record<string, string> = copy.assistant.tools

/** One step of the assistant: "Đang tìm trong kho nhạc…" while it works, then what it found. */
function ToolStepBase({ item }: { item: ToolItem }) {
  const styles = useStyles()
  const colors = useColors()

  if (item.status === "running") {
    const label = labels[item.name] ?? copy.assistant.tools.fallback
    return (
      <View
        accessible
        accessibilityLabel={label}
        accessibilityLiveRegion="polite"
        style={styles.row}
      >
        <ActivityIndicator size="small" color={colors.accentText} />
        <AppText variant="caption" color="secondary">
          {label}
        </AppText>
      </View>
    )
  }
  if (item.status === "failed") {
    return (
      <View accessible accessibilityLabel={copy.assistant.tools.failed} style={styles.row}>
        <CircleAlert size={sizes.iconSm} color={colors.secondary} />
        <AppText variant="caption" color="secondary">
          {copy.assistant.tools.failed}
        </AppText>
      </View>
    )
  }
  return <ResultCards display={item.display} />
}

export const ToolStep = memo(ToolStepBase)

const useStyles = makeStyles(() => ({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: sizes.iconMd },
}))
