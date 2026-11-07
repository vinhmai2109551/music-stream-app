export const DEFAULT_AI_MODEL = "gemini-3.5-flash-lite"
export const DEFAULT_AI_MAX_TOKENS = 1024
export const DEFAULT_AI_DAILY_MESSAGE_LIMIT = 30

export type ThinkingLevel = "minimal" | "low" | "medium" | "high"

export interface LlmConfig {
  /** Null when there is no key: AI features are then switched off. Never logged. */
  apiKey: string | null
  model: string
  maxTokens: number
  dailyMessageLimit: number
  /** Null = the model's own default. */
  thinkingLevel: ThinkingLevel | null
}

const THINKING_LEVELS: readonly string[] = ["minimal", "low", "medium", "high"]

/**
 * Reads the AI settings from `get` (the config service in the API, `process.env` in a script).
 * Empty values count as "not set". `GEMINI_API_KEY` wins; without it the key of the embeddings
 * (`EMBEDDING_API_KEY`) is used, because one Google AI Studio key does both.
 */
export function readLlmConfig(get: (key: string) => string | undefined): LlmConfig {
  const value = (key: string) => get(key)?.trim() || null
  const number = (key: string, fallback: number) => {
    const parsed = Number(value(key))
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
  }
  const level = value("AI_THINKING_LEVEL")?.toLowerCase()
  return {
    apiKey: value("GEMINI_API_KEY") ?? value("EMBEDDING_API_KEY"),
    model: value("AI_MODEL") ?? DEFAULT_AI_MODEL,
    maxTokens: number("AI_MAX_TOKENS", DEFAULT_AI_MAX_TOKENS),
    dailyMessageLimit: number("AI_DAILY_MESSAGE_LIMIT", DEFAULT_AI_DAILY_MESSAGE_LIMIT),
    thinkingLevel: level && THINKING_LEVELS.includes(level) ? (level as ThinkingLevel) : null,
  }
}
