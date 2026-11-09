import { ChevronDown, History, SquarePen } from "lucide-react-native"
import { View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { AssistantUsage } from "@/api/types"
import { AppText } from "@/components/ui/AppText"
import { IconButton } from "@/components/ui/IconButton"
import { MascotTile } from "@/components/ui/MascotTile"
import { copy } from "@/constants/copy"
import { makeStyles, radius, sizes, spacing } from "@/theme"
import { fillCount } from "@/utils/fillCount"

type ChatHeaderProps = {
  usage: AssistantUsage | null
  /** The chat is empty and new: starting another one would change nothing. */
  isNew: boolean
  onClose: () => void
  onHistory: () => void
  onNewChat: () => void
}

/** Close, the assistant's name with what is left of today's messages, conversations, new chat. */
export function ChatHeader({ usage, isNew, onClose, onHistory, onNewChat }: ChatHeaderProps) {
  const styles = useStyles()

  const insets = useSafeAreaInsets()
  const left = usage ? Math.max(0, usage.limit - usage.used) : null
  return (
    <View style={[styles.bar, { paddingTop: insets.top, height: insets.top + sizes.topBarHeight }]}>
      <IconButton icon={ChevronDown} label={copy.assistant.close} color="text" onPress={onClose} />
      <MascotTile
        size={sizes.mascotHeader}
        mascotSize={sizes.mascotHeader - spacing.sm}
        borderRadius={radius.pill}
        style={styles.avatar}
      />
      <View style={styles.title}>
        <AppText
          variant="subtitle"
          numberOfLines={1}
          ellipsizeMode="tail"
          accessibilityRole="header"
        >
          {copy.assistant.title}
        </AppText>
        {left !== null && (
          <AppText variant="small" color="secondary" numberOfLines={1}>
            {fillCount(copy.assistant.remaining, left)}
          </AppText>
        )}
      </View>
      <IconButton
        icon={History}
        label={copy.assistant.history.open}
        color="text"
        onPress={onHistory}
      />
      <IconButton
        icon={SquarePen}
        label={copy.assistant.history.newChat}
        color="text"
        disabled={isNew}
        style={isNew ? styles.off : undefined}
        onPress={onNewChat}
      />
    </View>
  )
}

const useStyles = makeStyles((colors) => ({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xs,
    backgroundColor: colors.background,
    borderBottomWidth: sizes.borderThin,
    borderBottomColor: colors.divider,
  },
  avatar: { marginHorizontal: spacing.sm },
  title: { flex: 1, minWidth: 0 },
  off: { opacity: 0.4 },
}))
