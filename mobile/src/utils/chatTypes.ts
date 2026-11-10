import type {
  AssistantActionStatus,
  AssistantDisplay,
  AssistantEvent,
  AssistantMessageLine,
} from "@/api/types"

/** What the person sees, top to bottom. */
export type ChatItem =
  | { kind: "user"; id: string; text: string; failed: boolean }
  | { kind: "assistant"; id: string; text: string; streaming: boolean; truncated: boolean }
  | {
      kind: "tool"
      id: string
      callId: string
      name: string
      status: "running" | "done" | "failed"
      display?: AssistantDisplay
    }
  | {
      kind: "action"
      id: string
      actionId: string
      callId: string
      tool: string
      summary: string
      expiresAt: string
      /** `BUSY`: the answer is on its way. `FAILED`: it was approved but could not be carried out. */
      status: AssistantActionStatus | "BUSY" | "FAILED"
      display?: AssistantDisplay
    }

export type ChatErrorKind =
  "quota" | "busy" | "unavailable" | "offline" | "conflict" | "expired" | "gone" | "generic"

export interface ChatError {
  kind: ChatErrorKind
  message: string
}

export interface ChatState {
  items: ChatItem[]
  /** The answer is being written. */
  streaming: boolean
  error: ChatError | null
  /** Where the current turn starts in `items`: everything from here on is taken back if it fails. */
  turnStart: number
  counter: number
}

export type ChatAction =
  | { type: "loaded"; lines: AssistantMessageLine[]; now: number }
  /** The server's version of the conversation, read again: the message about what failed stays. */
  | { type: "synced"; lines: AssistantMessageLine[]; now: number }
  | { type: "sent"; text: string }
  | { type: "event"; event: AssistantEvent }
  | { type: "answering"; actionId: string }
  /** The turn failed: what it wrote is taken back, the question stays marked as not sent. */
  | { type: "failed"; error: ChatError }
  /** The action could not be answered (and nothing of its answer is shown). */
  | { type: "actionFailed"; actionId: string; status: AssistantActionStatus; error: ChatError }
  /** The person pressed Stop: everything of the turn is taken back. */
  | { type: "stopped" }
  | { type: "dismissError" }
