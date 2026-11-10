import type {
  AssistantConversation,
  AssistantEvent,
  AssistantMessageLine,
  AssistantUsage,
} from "./types"
import { api } from "./client"
import { pathId } from "./query"
import { streamEvents } from "./stream"

/** Messages sent today and the daily limit. Answers 503 while the assistant is switched off. */
export const getAssistantUsage = () => api.get<AssistantUsage>("/ai/usage")

export const listConversations = () => api.get<AssistantConversation[]>("/ai/conversations")

/** A new, empty conversation (the empty one the user already has, if there is one). */
export const createConversation = () => api.post<AssistantConversation>("/ai/conversations")

export const deleteConversation = (id: string) =>
  api.delete<void>(`/ai/conversations/${pathId(id)}`)

/** What was said, with the cards of the tools, oldest first. */
export const listAssistantMessages = (id: string) =>
  api.get<AssistantMessageLine[]>(`/ai/conversations/${pathId(id)}/messages`)

/** Sends a message and receives the answer as events, until the stream ends or `signal` aborts. */
export const sendAssistantMessage = (
  id: string,
  text: string,
  onEvent: (event: AssistantEvent) => void,
  signal: AbortSignal,
) => streamEvents(`/ai/conversations/${pathId(id)}/messages`, { text }, onEvent, signal)

/** Says yes or no to a change the assistant proposed; the rest of its answer streams back. */
export const answerAssistantAction = (
  actionId: string,
  decision: "confirm" | "reject",
  onEvent: (event: AssistantEvent) => void,
  signal: AbortSignal,
) => streamEvents(`/ai/actions/${pathId(actionId)}/${decision}`, undefined, onEvent, signal)
