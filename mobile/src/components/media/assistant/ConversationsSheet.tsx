import { MessageSquare, Plus, Trash2 } from "lucide-react-native"
import { memo, useCallback, useEffect, useState } from "react"
import { FlatList, Pressable, View } from "react-native"
import type { AssistantConversation } from "@/api/types"
import { AppText } from "@/components/ui/AppText"
import { BottomSheet } from "@/components/ui/BottomSheet"
import { Button } from "@/components/ui/Button"
import { EmptyState } from "@/components/ui/EmptyState"
import { ErrorState } from "@/components/ui/ErrorState"
import { IconButton } from "@/components/ui/IconButton"
import { pressedStyle } from "@/components/ui/pressed"
import { Skeleton } from "@/components/ui/Skeleton"
import { useAssistantStore } from "@/store/assistantStore"
import { showToast } from "@/store/toastStore"
import { makeStyles, radius, sizes, spacing, useColors } from "@/theme"
import { formatConversationTime } from "@/utils/formatConversationTime"
import { useTranslation } from "@/i18n"

const SHEET_HEIGHT = "75%"
const SKELETON_ROWS = [0, 1, 2]

type RowProps = {
  conversation: AssistantConversation
  current: boolean
  onOpen: (id: string) => void
  onDelete: (conversation: AssistantConversation) => void
}

const Row = memo(function Row({ conversation, current, onOpen, onDelete }: RowProps) {
  const { t } = useTranslation()

  const styles = useStyles()
  const colors = useColors()

  const title = conversation.title || t("assistant.history.untitled")
  const when = formatConversationTime(conversation.updatedAt)
  return (
    <View style={[styles.row, current && styles.current]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${when}`}
        accessibilityState={{ selected: current }}
        onPress={() => onOpen(conversation.id)}
        style={({ pressed }) => [styles.main, pressedStyle(pressed)]}
      >
        <MessageSquare size={sizes.iconMd} strokeWidth={1.75} color={colors.accentText} />
        <View style={styles.text}>
          <AppText variant="subtitle" numberOfLines={1} ellipsizeMode="tail">
            {title}
          </AppText>
          <AppText variant="caption" color="secondary" numberOfLines={1}>
            {when}
          </AppText>
        </View>
      </Pressable>
      <IconButton
        icon={Trash2}
        label={`${t("assistant.history.delete")}: ${title}`}
        onPress={() => onDelete(conversation)}
      />
    </View>
  )
})

type ConversationsSheetProps = {
  visible: boolean
  /** The conversation that is open, to mark it. */
  currentId: string | null
  onClose: () => void
  onOpen: (id: string) => void
  onNewChat: () => void
  /** A conversation was deleted (the screen leaves it if it was the open one). */
  onDeleted: (id: string) => void
}

/** The person's conversations: open one, start a new one, delete one (asked first, in this sheet). */
export function ConversationsSheet({
  visible,
  currentId,
  onClose,
  onOpen,
  onNewChat,
  onDeleted,
}: ConversationsSheetProps) {
  const { t } = useTranslation()

  const styles = useStyles()
  const colors = useColors()

  const conversations = useAssistantStore((state) => state.conversations)
  const status = useAssistantStore((state) => state.status)
  const error = useAssistantStore((state) => state.error)
  const [deleting, setDeleting] = useState<AssistantConversation | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(() => void useAssistantStore.getState().loadConversations(), [])
  useEffect(() => {
    if (visible) refresh() // always fresh when opened; the cached list shows meanwhile
  }, [refresh, visible])

  const close = () => {
    setDeleting(null)
    onClose()
  }

  const confirmDelete = async () => {
    if (!deleting || busy) return
    setBusy(true)
    const done = await useAssistantStore.getState().removeConversation(deleting.id)
    setBusy(false)
    if (!done) return // the store told the person; the row came back
    showToast(t("assistant.history.deleted"))
    onDeleted(deleting.id)
    setDeleting(null)
  }

  const showSkeleton = conversations.length === 0 && (status === "loading" || status === "idle")
  return (
    <BottomSheet
      visible={visible}
      onClose={close}
      title={deleting ? t("assistant.history.deleteTitle") : t("assistant.history.title")}
      height={deleting ? undefined : SHEET_HEIGHT}
    >
      {deleting ? (
        <View style={styles.confirm}>
          <AppText color="secondary">{t("assistant.history.deleteMessage")}</AppText>
          <Button
            label={t("assistant.history.confirmDelete")}
            loading={busy}
            onPress={() => void confirmDelete()}
          />
          <Button
            label={t("assistant.history.keep")}
            variant="tonal"
            onPress={() => setDeleting(null)}
          />
        </View>
      ) : (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("assistant.history.newChat")}
            onPress={() => {
              close()
              onNewChat()
            }}
            style={({ pressed }) => [styles.newChat, pressedStyle(pressed)]}
          >
            <Plus size={sizes.iconMd} strokeWidth={2} color={colors.accentText} />
            <AppText variant="button" color="accentText">
              {t("assistant.history.newChat")}
            </AppText>
          </Pressable>
          {showSkeleton ? (
            <View style={styles.skeletons}>
              {SKELETON_ROWS.map((key) => (
                <Skeleton key={key} height={sizes.trackRowHeight} rounded={radius.card} />
              ))}
            </View>
          ) : status === "error" && conversations.length === 0 ? (
            <ErrorState error={error} onRetry={refresh} />
          ) : conversations.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title={t("assistant.history.emptyTitle")}
              description={t("assistant.history.emptyDescription")}
            />
          ) : (
            <FlatList
              data={conversations}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Row
                  conversation={item}
                  current={item.id === currentId}
                  onOpen={(id) => {
                    close()
                    onOpen(id)
                  }}
                  onDelete={setDeleting}
                />
              )}
              showsVerticalScrollIndicator={false}
            />
          )}
        </>
      )}
    </BottomSheet>
  )
}

const useStyles = makeStyles((colors) => ({
  newChat: {
    minHeight: sizes.minTouch,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radius.card,
    backgroundColor: colors.accentSoft,
  },
  skeletons: { gap: spacing.sm },
  row: {
    minHeight: sizes.trackRowHeight,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.card,
    paddingLeft: spacing.md,
  },
  current: { backgroundColor: colors.accentFaint },
  main: {
    flex: 1,
    minWidth: 0,
    minHeight: sizes.trackRowHeight,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  text: { flex: 1, minWidth: 0 },
  confirm: { gap: spacing.md, paddingVertical: spacing.md },
}))
