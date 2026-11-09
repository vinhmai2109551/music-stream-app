import { memo } from "react"
import type { ChatItem } from "@/utils/chatState"
import { ActionCard } from "./ActionCard"
import { AssistantBubble, UserBubble } from "./Bubbles"
import { ToolStep } from "./ToolStep"

type ChatItemViewProps = {
  item: ChatItem
  /** An answer is being written: proposals cannot be decided until it ends. */
  locked: boolean
  onResend: (text: string) => void
  onConfirm: (actionId: string) => void
  onReject: (actionId: string) => void
}

/** One line of the conversation, whatever it is. */
function ChatItemViewBase({ item, locked, onResend, onConfirm, onReject }: ChatItemViewProps) {
  switch (item.kind) {
    case "user":
      return <UserBubble text={item.text} failed={item.failed} onResend={onResend} />
    case "assistant":
      return (
        <AssistantBubble text={item.text} streaming={item.streaming} truncated={item.truncated} />
      )
    case "tool":
      return <ToolStep item={item} />
    case "action":
      return <ActionCard item={item} locked={locked} onConfirm={onConfirm} onReject={onReject} />
  }
}

export const ChatItemView = memo(ChatItemViewBase)
