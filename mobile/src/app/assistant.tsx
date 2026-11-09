import { router } from "expo-router"
import { CloudOff } from "lucide-react-native"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  AccessibilityInfo,
  FlatList,
  KeyboardAvoidingView,
  ScrollView,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ChatBanner } from "@/components/media/assistant/ChatBanner"
import { ChatHeader } from "@/components/media/assistant/ChatHeader"
import { ChatItemView } from "@/components/media/assistant/ChatItemView"
import { Composer } from "@/components/media/assistant/Composer"
import { ConversationsSheet } from "@/components/media/assistant/ConversationsSheet"
import { Welcome } from "@/components/media/assistant/Welcome"
import { MiniPlayer } from "@/components/media/MiniPlayer"
import { Button } from "@/components/ui/Button"
import { EmptyState } from "@/components/ui/EmptyState"
import { ErrorState } from "@/components/ui/ErrorState"
import { Skeleton } from "@/components/ui/Skeleton"
import { copy } from "@/constants/copy"
import { useAssistantChat } from "@/hooks/useAssistantChat"
import { useKeyboardVisible } from "@/hooks/useKeyboardVisible"
import { useAssistantStore } from "@/store/assistantStore"
import { makeStyles, radius, spacing } from "@/theme"
import type { ChatItem } from "@/utils/chatState"

/** How far from the end the list may be and still follow a growing answer. */
const FOLLOW_DISTANCE = 120
const SKELETON_BUBBLES = [
  { width: "55%", side: "flex-end" },
  { width: "80%", side: "flex-start" },
  { width: "65%", side: "flex-start" },
] as const

const keyOf = (item: ChatItem) => item.id

/** The assistant: a conversation that streams its answer, shows what it found, and asks before it changes anything. */
export default function AssistantScreen() {
  const styles = useStyles()
  const insets = useSafeAreaInsets()

  const availability = useAssistantStore((state) => state.availability)
  const usage = useAssistantStore((state) => state.usage)
  const [historyOpen, setHistoryOpen] = useState(false)
  const chat = useAssistantChat()
  const { conversationId } = chat
  const keyboardUp = useKeyboardVisible()

  const listRef = useRef<FlatList<ChatItem>>(null)
  const following = useRef(true)

  const { send: sendMessage, streaming } = chat
  const send = useCallback(
    (text: string) => {
      following.current = true
      void sendMessage(text)
    },
    [sendMessage],
  )
  useEffect(() => {
    if (streaming) AccessibilityInfo.announceForAccessibility(copy.assistant.replying)
  }, [streaming])
  useEffect(() => {
    following.current = true // another conversation starts at its end
  }, [conversationId])
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent
    following.current =
      contentSize.height - layoutMeasurement.height - contentOffset.y < FOLLOW_DISTANCE
  }
  const followAnswer = () => {
    if (following.current) listRef.current?.scrollToEnd({ animated: true })
  }

  if (availability === "unavailable") {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <EmptyState
          icon={CloudOff}
          title={copy.assistant.unavailable.title}
          description={copy.assistant.unavailable.description}
          action={<Button label={copy.assistant.unavailable.close} onPress={() => router.back()} />}
        />
      </View>
    )
  }

  const dayUsedUp = usage !== null && usage.used >= usage.limit
  const isNew = conversationId === null && chat.items.length === 0

  let body
  if (chat.history.status === "loading") {
    body = (
      <View accessibilityLabel={copy.assistant.loadingHistory} style={styles.skeletons}>
        {SKELETON_BUBBLES.map((bubble, index) => (
          <Skeleton
            key={index}
            width={bubble.width}
            height={spacing.giant}
            rounded={radius.card}
            style={{ alignSelf: bubble.side }}
          />
        ))}
      </View>
    )
  } else if (chat.history.status === "error") {
    body = <ErrorState error={chat.history.error} onRetry={() => void chat.reload()} />
  } else if (chat.items.length === 0) {
    body = (
      <ScrollView keyboardShouldPersistTaps="handled">
        <Welcome onPick={send} disabled={streaming || dayUsedUp} />
      </ScrollView>
    )
  } else {
    body = (
      <FlatList
        ref={listRef}
        data={chat.items}
        keyExtractor={keyOf}
        renderItem={({ item }) => (
          <ChatItemView
            item={item}
            locked={chat.streaming}
            onResend={send}
            onConfirm={chat.confirm}
            onReject={chat.reject}
          />
        )}
        ItemSeparatorComponent={Gap}
        contentContainerStyle={styles.list}
        onContentSizeChange={followAnswer}
        onScroll={onScroll}
        scrollEventThrottle={64}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      />
    )
  }

  return (
    <View style={styles.screen}>
      <ChatHeader
        usage={usage}
        isNew={isNew}
        onClose={() => router.back()}
        onHistory={() => setHistoryOpen(true)}
        onNewChat={chat.startNew}
      />
      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        <View style={styles.flex}>{body}</View>
        {chat.error !== null && (
          <ChatBanner message={chat.error.message} onDismiss={chat.dismissError} />
        )}
        {!keyboardUp && <MiniPlayer />}
        <View style={{ paddingBottom: keyboardUp ? spacing.sm : insets.bottom + spacing.sm }}>
          <Composer
            streaming={chat.streaming}
            disabled={dayUsedUp || chat.error?.kind === "quota"}
            onSend={send}
            onStop={chat.stop}
          />
        </View>
      </KeyboardAvoidingView>
      <ConversationsSheet
        visible={historyOpen}
        currentId={conversationId}
        onClose={() => setHistoryOpen(false)}
        onOpen={chat.open}
        onNewChat={chat.startNew}
        onDeleted={(id) => {
          if (id === conversationId) chat.startNew()
        }}
      />
    </View>
  )
}

function Gap() {
  return <View style={gapStyle} />
}
const gapStyle = { height: spacing.md } as const

const useStyles = makeStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  list: { padding: spacing.lg },
  skeletons: { gap: spacing.md, padding: spacing.lg },
}))
