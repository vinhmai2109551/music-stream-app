import { Inject, Injectable, ServiceUnavailableException } from "@nestjs/common"
import { EMBED_BATCH_SIZE } from "./embedding-index.service.js"
import { contentHash } from "./embedding-text.js"
import { EmbeddingsService } from "./embeddings.service.js"
import { chunkMarkdown, type KnowledgeChunkText } from "./knowledge-chunker.js"
import {
  KNOWLEDGE_FILES,
  KNOWLEDGE_STORE,
  type KnowledgeFile,
  type KnowledgeStore,
} from "./ports.js"
import { withBackoff } from "./retry.js"

const RETRY_ATTEMPTS = 5
const RETRY_BASE_DELAY_MS = 1000

export interface KnowledgeSyncOptions {
  /** Make the vectors again even when they are up to date. */
  force?: boolean
  onRetry?: (attempt: number, delayMs: number) => void
  /** Replaceable so tests need not wait. */
  sleep?: (ms: number) => Promise<void>
}

export interface KnowledgeSyncStats {
  files: number
  /** Chunks of the files now. */
  chunks: number
  /** Vectors made and stored. */
  embedded: number
  /** Chunks already up to date. */
  unchanged: number
  /** Chunks deleted because their file got shorter or was deleted. */
  removed: number
}

/** The text that is turned into a vector: the heading gives the chunk its topic. */
export function knowledgeEmbeddingText(chunk: Pick<KnowledgeChunkText, "heading" | "content">) {
  return chunk.heading ? `${chunk.heading}\n${chunk.content}` : chunk.content
}

/** Keeps the vectors of the help texts up to date; only the chunks whose text changed are made again. */
@Injectable()
export class KnowledgeIndexService {
  constructor(
    private readonly embeddings: EmbeddingsService,
    @Inject(KNOWLEDGE_STORE) private readonly store: KnowledgeStore,
    @Inject(KNOWLEDGE_FILES) private readonly readFiles: () => Promise<KnowledgeFile[]>,
  ) {}

  async sync(options: KnowledgeSyncOptions = {}): Promise<KnowledgeSyncStats> {
    const model = this.embeddings.model
    if (!model) throw new ServiceUnavailableException("Semantic features are not configured")

    const files = await this.readFiles()
    // A wrong folder must not wipe the knowledge base.
    if (files.length === 0) throw new Error("No help files (*.md) were found to index")

    const stats: KnowledgeSyncStats = {
      files: files.length,
      chunks: 0,
      embedded: 0,
      unchanged: 0,
      removed: 0,
    }
    for (const file of files) {
      const chunks = chunkMarkdown(file.name, file.text)
      stats.chunks += chunks.length
      const stored = await this.store.stored(file.name)
      const items = chunks.map((chunk) => {
        const text = knowledgeEmbeddingText(chunk)
        return { chunk, text, hash: contentHash(text, model) }
      })
      const stale = items.filter(({ chunk, hash }) => {
        const current = stored.get(chunk.position)
        return options.force || !current || current.contentHash !== hash || current.model !== model
      })
      stats.unchanged += items.length - stale.length

      for (let start = 0; start < stale.length; start += EMBED_BATCH_SIZE) {
        const batch = stale.slice(start, start + EMBED_BATCH_SIZE)
        const vectors = await withBackoff(
          () => this.embeddings.embedDocuments(batch.map((item) => item.text)),
          {
            attempts: RETRY_ATTEMPTS,
            baseDelayMs: RETRY_BASE_DELAY_MS,
            shouldRetry: (error) => error instanceof ServiceUnavailableException,
            onRetry: (_error, attempt, delayMs) => options.onRetry?.(attempt, delayMs),
            sleep: options.sleep,
          },
        )
        await this.store.save(
          batch.map((item, index) => ({
            ...item.chunk,
            vector: vectors[index],
            model,
            contentHash: item.hash,
          })),
        )
        stats.embedded += batch.length
      }
      stats.removed += await this.store.deleteFrom(file.name, chunks.length)
    }
    stats.removed += await this.store.deleteSourcesNotIn(files.map((file) => file.name))
    return stats
  }
}
