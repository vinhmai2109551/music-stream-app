import type { AssistantActionStatus, AssistantEvent } from "@/api/types"
import { itemsFromHistory } from "./chatHistory"
import type { ChatAction, ChatItem, ChatState } from "./chatTypes"

export { itemsFromHistory } from "./chatHistory"
export type { ChatAction, ChatError, ChatErrorKind, ChatItem, ChatState } from "./chatTypes"

export const initialChatState: ChatState = {
  items: [],
  streaming: false,
  error: null,
  turnStart: 0,
  counter: 0,
}

const withId = (state: ChatState, prefix: string) => ({
  id: `${prefix}-${state.counter + 1}`,
  counter: state.counter + 1,
})

const updateItem = (
  items: ChatItem[],
  matches: (item: ChatItem) => boolean,
  change: (item: ChatItem) => ChatItem,
): ChatItem[] => items.map((item) => (matches(item) ? change(item) : item))

/** Ends everything that was still in progress. */
function settle(items: ChatItem[]): ChatItem[] {
  return items.map((item): ChatItem => {
    if (item.kind === "assistant" && item.streaming) return { ...item, streaming: false }
    if (item.kind === "tool" && item.status === "running") return { ...item, status: "done" }
    return item
  })
}

/**
 * Proposals whose answer never got through wait for one again (`decided`: this one has a verdict,
 * e.g. it expired). A proposal that already has its result is left as it is.
 */
function unbusy(
  items: ChatItem[],
  decided?: { actionId: string; status: AssistantActionStatus },
): ChatItem[] {
  return items.map((item): ChatItem => {
    if (item.kind !== "action" || item.status !== "BUSY") return item
    return { ...item, status: decided?.actionId === item.actionId ? decided.status : "PENDING" }
  })
}

function applyEvent(state: ChatState, event: AssistantEvent): ChatState {
  switch (event.type) {
    case "text_delta": {
      const last = state.items[state.items.length - 1]
      if (last?.kind === "assistant" && last.streaming) {
        const items = [...state.items.slice(0, -1), { ...last, text: last.text + event.text }]
        return { ...state, items }
      }
      const { id, counter } = withId(state, "assistant")
      const item: ChatItem = {
        kind: "assistant",
        id,
        text: event.text,
        streaming: true,
        truncated: false,
      }
      return { ...state, items: [...settle(state.items), item], counter }
    }
    case "tool_call": {
      const { id, counter } = withId(state, "tool")
      const item: ChatItem = {
        kind: "tool",
        id,
        callId: event.callId,
        name: event.name,
        status: "running",
      }
      return { ...state, items: [...settle(state.items), item], counter }
    }
    case "tool_result": {
      const status = event.ok ? "done" : "failed"
      if (event.action) {
        // The answer of the person to a proposed change: its card shows what became of it.
        const { id: actionId, status: decided } = event.action
        const next: AssistantActionStatus | "FAILED" =
          decided === "CONFIRMED" && !event.ok ? "FAILED" : decided
        return {
          ...state,
          items: updateItem(
            state.items,
            (item) => item.kind === "action" && item.actionId === actionId,
            (item) => ({ ...item, status: next, display: event.display }) as ChatItem,
          ),
        }
      }
      const known = state.items.some((item) => item.kind === "tool" && item.callId === event.callId)
      if (!known) {
        const { id, counter } = withId(state, "tool")
        const item: ChatItem = {
          kind: "tool",
          id,
          callId: event.callId,
          name: event.name,
          status,
          display: event.display,
        }
        return { ...state, items: [...state.items, item], counter }
      }
      return {
        ...state,
        items: updateItem(
          state.items,
          (item) => item.kind === "tool" && item.callId === event.callId,
          (item) => ({ ...item, status, display: event.display }) as ChatItem,
        ),
      }
    }
    case "action_required": {
      const { id, counter } = withId(state, "action")
      const item: ChatItem = {
        kind: "action",
        id,
        actionId: event.actionId,
        callId: event.callId,
        tool: event.tool,
        summary: event.summary,
        expiresAt: event.expiresAt,
        status: "PENDING",
      }
      // The card of the call that was running becomes the card to approve.
      const replaced = state.items.some((it) => it.kind === "tool" && it.callId === event.callId)
      const items = replaced
        ? state.items.map((it) =>
            it.kind === "tool" && it.callId === event.callId ? { ...item, id: it.id } : it,
          )
        : [...settle(state.items), item]
      return { ...state, items, counter: replaced ? state.counter : counter }
    }
    case "client_action":
      return state // the app plays the tracks; nothing to show
    case "done": {
      const items = settle(state.items)
      const last = items[items.length - 1]
      return {
        ...state,
        streaming: false,
        items:
          event.truncated && last?.kind === "assistant"
            ? [...items.slice(0, -1), { ...last, truncated: true }]
            : items,
      }
    }
    case "error":
      return state // the hook turns it into a `failed` action with a kind
  }
}

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "loaded":
      return {
        ...initialChatState,
        items: itemsFromHistory(action.lines, action.now),
        counter: state.counter,
      }
    case "synced":
      return {
        ...initialChatState,
        items: itemsFromHistory(action.lines, action.now),
        error: state.error,
        counter: state.counter,
      }
    case "sent": {
      const { id, counter } = withId(state, "user")
      // A question that was not sent is dropped when the person sends again (it is the same one, or
      // they gave up on it); the server never had it.
      const kept = state.items.filter((item) => !(item.kind === "user" && item.failed))
      return {
        ...state,
        items: [...kept, { kind: "user", id, text: action.text, failed: false }],
        streaming: true,
        error: null,
        turnStart: kept.length,
        counter,
      }
    }
    case "event":
      return applyEvent(state, action.event)
    case "answering":
      return {
        ...state,
        items: updateItem(
          state.items,
          (item) => item.kind === "action" && item.actionId === action.actionId,
          (item) => ({ ...item, status: "BUSY" }) as ChatItem,
        ),
        streaming: true,
        error: null,
        turnStart: state.items.length,
      }
    case "failed": {
      const startedWithQuestion = state.items[state.turnStart]?.kind === "user"
      // The question is not kept by the server: mark it so that the person can send it again.
      const items = startedWithQuestion
        ? state.items
            .slice(0, state.turnStart + 1)
            .map((item, index): ChatItem =>
              item.kind === "user" && index === state.turnStart ? { ...item, failed: true } : item,
            )
        : unbusy(state.items.slice(0, state.turnStart))
      return { ...state, items, streaming: false, error: action.error }
    }
    case "actionFailed":
      return {
        ...state,
        items: unbusy(state.items.slice(0, state.turnStart), {
          actionId: action.actionId,
          status: action.status,
        }),
        streaming: false,
        error: action.error,
      }
    case "stopped":
      return {
        ...state,
        items: unbusy(state.items.slice(0, state.turnStart)),
        streaming: false,
      }
    case "dismissError":
      return { ...state, error: null }
  }
}
