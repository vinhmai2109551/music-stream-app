import { Module } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { EMBEDDING_PROVIDER, type EmbeddingProvider } from "./embedding-provider.js"
import { readEmbeddingsConfig } from "./embeddings.config.js"
import { EmbeddingsService } from "./embeddings.service.js"
import { GeminiEmbeddingProvider } from "./gemini-embedding.provider.js"
import { HashingEmbeddingProvider } from "./hashing-embedding.provider.js"

/** Builds the provider the settings ask for; null when there is none (or no key for it). */
export function createEmbeddingProvider(config: ConfigService): EmbeddingProvider | null {
  const { provider, model, apiKey } = readEmbeddingsConfig(config)
  if (provider === "fake") return new HashingEmbeddingProvider()
  if (provider === "gemini" && apiKey) return new GeminiEmbeddingProvider(model, apiKey)
  return null
}

/** Text embeddings (vectors) for semantic search, recommendations and the assistant. */
@Module({
  providers: [
    { provide: EMBEDDING_PROVIDER, inject: [ConfigService], useFactory: createEmbeddingProvider },
    EmbeddingsService,
  ],
  exports: [EmbeddingsService],
})
export class EmbeddingsModule {}
