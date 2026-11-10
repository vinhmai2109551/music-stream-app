import type { LlmMessage, LlmPart } from "../../shared/llm/llm-client.js"

/** A stored message: who said it and what it holds. */
export interface StoredMessage {
  role: "user" | "assistant"
  parts: LlmPart[]
}

/** True for a message the person wrote: it starts with their text, not with a tool result. */
const startsATurn = (message: StoredMessage) =>
  message.role === "user" && message.parts.some((part) => part.type === "text")

/**
 * The last `limit` messages, cut so that they make sense on their own. A cut can fall between a
 * tool call and its result, or between a result and the answer to it, and a model refuses a
 * result whose call it cannot see; so the window starts at the first message the person wrote.
 * If that leaves nothing (the last `limit` are all tool traffic), it starts at the newest such
 * message instead, so the question being answered is never lost.
 */
export function windowHistory(messages: readonly StoredMessage[], limit: number): LlmMessage[] {
  const recent = messages.slice(-limit)
  const first = recent.findIndex(startsATurn)
  if (first !== -1) return recent.slice(first)
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (startsATurn(messages[index])) return messages.slice(index)
  }
  return []
}
