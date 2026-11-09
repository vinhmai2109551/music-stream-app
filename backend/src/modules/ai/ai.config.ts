import type { ConfigService } from "@nestjs/config"
import { readLlmConfig, type LlmConfig } from "../../shared/llm/llm-config.js"

/** Longest message a person may send, in characters. */
export const MAX_MESSAGE_CHARS = 2000
/** Messages of the conversation sent to the model with each new one. */
export const HISTORY_MESSAGES = 20
/** Longest title of a conversation (the start of its first message). */
export const MAX_TITLE_CHARS = 60
/** Messages of a conversation shown at once (the latest). */
export const MAX_MESSAGES_SHOWN = 500
/** Conversations a user may have: the most that the list shows. */
export const MAX_CONVERSATIONS = 50
/** The whole answer, tools included, must be finished within this time. */
export const ANSWER_TIMEOUT_MS = 90_000
/** The day of the daily limit starts and ends at midnight of this time zone. */
export const QUOTA_TIME_ZONE = "Asia/Ho_Chi_Minh"
/** A line sent now and then while the model thinks, so that no proxy closes the quiet connection. */
export const HEARTBEAT_MS = 15_000

/** The settings of the assistant (`AI_*`), read once. */
export function readAiConfig(config: ConfigService): LlmConfig {
  return readLlmConfig((key) => config.get<string>(key))
}
