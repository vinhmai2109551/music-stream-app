import type { ConfigService } from "@nestjs/config"

export type EmbeddingProviderName = "gemini" | "fake"

export const DEFAULT_EMBEDDING_MODEL = "gemini-embedding-2"

export interface EmbeddingsConfig {
  /** Null while no provider is set: semantic features are then switched off. */
  provider: EmbeddingProviderName | null
  model: string
  /** Null when not set. Never logged or sent to the app. */
  apiKey: string | null
}

/** Reads the EMBEDDING_* settings. Empty values count as "not set". */
export function readEmbeddingsConfig(config: ConfigService): EmbeddingsConfig {
  const value = (key: string) => config.get<string>(key)?.trim() || null
  const name = value("EMBEDDING_PROVIDER")?.toLowerCase()
  return {
    provider: name === "gemini" || name === "fake" ? name : null,
    model: value("EMBEDDING_MODEL") ?? DEFAULT_EMBEDDING_MODEL,
    apiKey: value("EMBEDDING_API_KEY"),
  }
}
