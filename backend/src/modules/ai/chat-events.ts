import {
  LlmRateLimitedError,
  LlmUnavailableError,
  type JsonObject,
} from "../../shared/llm/llm-client.js"
import type { TrackView } from "../tracks/index.js"
import type { ToolDisplay } from "./tools/registry.js"

/** What a chat sends to the app while the assistant answers (the events of the SSE stream). */
export type ChatEvent =
  /** A piece of the answer's text. */
  | { type: "text_delta"; text: string }
  /** The assistant is using a tool (for a line like "Đang tìm nhạc..."). */
  | { type: "tool_call"; callId: string; name: string; args: JsonObject }
  /** The tool is done: `display` holds the cards to show (tracks, artists, ...). */
  | {
      type: "tool_result"
      callId: string
      name: string
      ok: boolean
      display?: ToolDisplay
      /** Set when the result is the answer of the person to a proposed change. */
      action?: { id: string; status: "CONFIRMED" | "REJECTED" }
    }
  /**
   * The assistant proposes a change and waits. The stream then ends with `done` (awaitingAction);
   * the person answers with `POST /ai/actions/:id/confirm` or `/reject`, which streams the rest.
   */
  | {
      type: "action_required"
      actionId: string
      callId: string
      tool: string
      /** One sentence that says exactly what will happen. */
      summary: string
      input: JsonObject
      /** ISO time after which it can no longer be approved. */
      expiresAt: string
    }
  /** Something for the app to do: play these tracks now. */
  | { type: "client_action"; action: "play_tracks"; trackIds: string[]; tracks: TrackView[] }
  /**
   * The answer is complete and saved. `truncated`: the model ran out of room and it is cut short.
   * `awaitingAction`: it is waiting for the person to approve a change.
   */
  | { type: "done"; messageId: string; truncated: boolean; awaitingAction: boolean }
  /** The answer failed. The question is not kept and the message is not counted. */
  | { type: "error"; code: ChatErrorCode; message: string }

export type ChatErrorCode =
  "assistant_busy" | "assistant_unavailable" | "assistant_error" | "empty_answer" | "timeout"

export type ErrorEvent = Extract<ChatEvent, { type: "error" }>

export const BUSY_MESSAGE = "Trợ lý đang quá tải, thử lại sau ít phút"
const UNAVAILABLE_MESSAGE = "Trợ lý tạm thời không dùng được, thử lại sau ít phút"
const ERROR_MESSAGE = "Trợ lý gặp lỗi. Vui lòng thử lại"
const EMPTY_MESSAGE = "Trợ lý chưa trả lời được câu này. Bạn thử hỏi lại theo cách khác nhé"
const TIMEOUT_MESSAGE = "Trợ lý trả lời quá lâu. Vui lòng thử lại"

/** The error event for a failure of the model: friendly text, and never a detail of the provider. */
export function describeChatError(error: unknown, timedOut: boolean): ErrorEvent {
  if (timedOut) return { type: "error", code: "timeout", message: TIMEOUT_MESSAGE }
  if (error instanceof LlmRateLimitedError) {
    return { type: "error", code: "assistant_busy", message: BUSY_MESSAGE }
  }
  if (error instanceof LlmUnavailableError) {
    return { type: "error", code: "assistant_unavailable", message: UNAVAILABLE_MESSAGE }
  }
  // A refusal of the provider (bad key, bad request) or a bug of ours: the person cannot fix it.
  return { type: "error", code: "assistant_error", message: ERROR_MESSAGE }
}

export const EMPTY_ANSWER: ErrorEvent = {
  type: "error",
  code: "empty_answer",
  message: EMPTY_MESSAGE,
}

/** The text of one SSE event: `event: <type>`, the other fields as JSON `data:`, a blank line. */
export function toSse(event: ChatEvent): string {
  const { type, ...data } = event
  return `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`
}
