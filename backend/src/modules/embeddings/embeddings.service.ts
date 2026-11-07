import { Inject, Injectable, Logger, ServiceUnavailableException } from "@nestjs/common"
import {
  EMBEDDING_PROVIDER,
  type EmbeddingKind,
  type EmbeddingProvider,
} from "./embedding-provider.js"
import { EmbeddingServiceError } from "./gemini-embedding.provider.js"

/**
 * The embedding provider as the rest of the API sees it. While no provider is configured every
 * call answers 503, so semantic features switch off and the rest of the API keeps working.
 */
@Injectable()
export class EmbeddingsService {
  private readonly logger = new Logger(EmbeddingsService.name)

  constructor(@Inject(EMBEDDING_PROVIDER) private readonly provider: EmbeddingProvider | null) {
    if (!provider) this.logger.warn("No embedding provider is set: semantic features are off")
  }

  get enabled(): boolean {
    return this.provider !== null
  }

  /** Name of the model that makes the vectors; stored with them. Null while switched off. */
  get model(): string | null {
    return this.provider?.model ?? null
  }

  get dimensions(): number | null {
    return this.provider?.dimensions ?? null
  }

  /** Vectors for texts to store. Answers 503 when there is no provider or the service is down. */
  embedDocuments(texts: readonly string[]): Promise<number[][]> {
    return this.embed(texts, "document")
  }

  /** The vector of one question. */
  async embedQuery(text: string): Promise<number[]> {
    const [vector] = await this.embed([text], "query")
    return vector
  }

  private async embed(texts: readonly string[], kind: EmbeddingKind): Promise<number[][]> {
    if (!this.provider) {
      throw new ServiceUnavailableException("Semantic features are not configured")
    }
    if (texts.length === 0) return []
    try {
      return await this.provider.embed(texts, kind)
    } catch (error) {
      if (error instanceof EmbeddingServiceError) {
        this.logger.error(`Embedding failed (${error.status}): ${error.message}`)
        throw new ServiceUnavailableException("Semantic features are temporarily unavailable")
      }
      throw error
    }
  }
}
