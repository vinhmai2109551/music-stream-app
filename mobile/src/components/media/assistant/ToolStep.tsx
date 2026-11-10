import { CircleAlert } from "lucide-react-native"
import { memo } from "react"
import { ActivityIndicator, View } from "react-native"
import type { ChatItem } from "@/utils/chatState"
import { AppText } from "@/components/ui/AppText"
import { makeStyles, sizes, spacing, useColors } from "@/theme"
import { ResultCards } from "./ResultCards"
import { useTranslation } from "@/i18n"

type ToolItem = Extract<ChatItem, { kind: "tool" }>

/** The tools the assistant can run, as the server names them. */
const TOOL_NAMES = [
  "search_catalog",
  "get_track",
  "get_artist",
  "get_album",
  "get_playlist",
  "get_my_library",
  "recommend_tracks",
  "similar_tracks",
  "search_help",
  "play_tracks",
  "create_playlist",
  "add_tracks_to_playlist",
  "like_tracks",
  "follow_artist",
] as const
type ToolName = (typeof TOOL_NAMES)[number]
const isToolName = (name: string): name is ToolName =>
  (TOOL_NAMES as readonly string[]).includes(name)

/** One step of the assistant: "Đang tìm trong kho nhạc…" while it works, then what it found. */
function ToolStepBase({ item }: { item: ToolItem }) {
  const { t } = useTranslation()

  const styles = useStyles()
  const colors = useColors()

  if (item.status === "running") {
    const label = isToolName(item.name)
      ? t(`assistant.tools.${item.name}`)
      : t("assistant.tools.fallback")
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
      <View accessible accessibilityLabel={t("assistant.tools.failed")} style={styles.row}>
        <CircleAlert size={sizes.iconSm} color={colors.secondary} />
        <AppText variant="caption" color="secondary">
          {t("assistant.tools.failed")}
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
