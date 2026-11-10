import type { ConfigService } from "@nestjs/config"
import type { EmbeddingProvider } from "./embedding-provider.js"
import { readEmbeddingsConfig } from "./embeddings.config.js"
import { GeminiEmbeddingProvider } from "./gemini-embedding.provider.js"
import { HashingEmbeddingProvider } from "./hashing-embedding.provider.js"

/** Builds the provider the settings ask for; null when there is none (or no key for it). */
export function createEmbeddingProvider(config: ConfigService): EmbeddingProvider | null {
  const { provider, model, apiKey } = readEmbeddingsConfig(config)
  if (provider === "fake") return new HashingEmbeddingProvider()
  if (provider === "gemini" && apiKey) return new GeminiEmbeddingProvider(model, apiKey)
  return null
}
