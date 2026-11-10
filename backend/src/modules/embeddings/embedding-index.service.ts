import { Inject, Injectable, ServiceUnavailableException } from "@nestjs/common"
import { contentHash } from "./embedding-text.js"
import { EmbeddingsService } from "./embeddings.service.js"
import {
  CATALOG_SOURCES,
  EMBEDDING_STORE,
  type CatalogSources,
  type EmbeddedKind,
  type EmbeddingStore,
} from "./ports.js"
import { withBackoff } from "./retry.js"

/** Texts embedded in one go; also the number of ids read from the catalog at a time. */
export const EMBED_BATCH_SIZE = 64

const RETRY_ATTEMPTS = 5
const RETRY_BASE_DELAY_MS = 1000

export interface SyncOptions {
  /** Make the vectors again even when the stored hash says they are up to date. */
  force?: boolean
}

export interface SyncStats {
  /** Vectors made and stored. */
  embedded: number
  /** Vectors already up to date. */
  unchanged: number
  /** Ids that no longer exist in the catalog. */
  gone: number
}

export interface BackfillProgress {
  kind: EmbeddedKind
  /** Ids looked at so far of this kind. */
  done: number
  total: number
  embedded: number
  unchanged: number
}

export interface BackfillOptions extends SyncOptions {
  onProgress?: (progress: BackfillProgress) => void
  onRetry?: (attempt: number, delayMs: number) => void
  /** Replaceable so tests need not wait. */
  sleep?: (ms: number) => Promise<void>
}

const emptyStats = (): SyncStats => ({ embedded: 0, unchanged: 0, gone: 0 })

const add = (total: SyncStats, part: SyncStats) => {
  total.embedded += part.embedded
  total.unchanged += part.unchanged
  total.gone += part.gone
}

const chunk = <T>(items: readonly T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size),
  )

/**
 * Keeps the vector of every track and artist up to date: it reads the text that describes each
 * one, and makes a new vector only for those whose text (or the model) changed since the stored
 * one - the stored hash decides.
 */
@Injectable()
export class EmbeddingIndexService {
  constructor(
    private readonly embeddings: EmbeddingsService,
    @Inject(EMBEDDING_STORE) private readonly store: EmbeddingStore,
    @Inject(CATALOG_SOURCES) private readonly sources: CatalogSources,
  ) {}

  syncTracks(ids: readonly string[], options: SyncOptions = {}): Promise<SyncStats> {
    return this.sync("track", ids, options)
  }

  syncArtists(ids: readonly string[], options: SyncOptions = {}): Promise<SyncStats> {
    return this.sync("artist", ids, options)
  }

  /** An artist's name, region or genres are part of the text of each of their tracks. */
  async syncTracksOfArtist(artistId: string, options: SyncOptions = {}): Promise<SyncStats> {
    return this.sync("track", await this.sources.idsOfArtist(artistId), options)
  }

  /**
   * Brings every vector up to date: artists first, then tracks, a batch at a time. A rate limit or
   * a hiccup of the embedding service is waited out with growing pauses (1, 2, 4, 8 seconds).
   */
  async backfill(
    options: BackfillOptions = {},
  ): Promise<{ tracks: SyncStats; artists: SyncStats }> {
    this.requireProvider()
    const result = { tracks: emptyStats(), artists: emptyStats() }
    for (const kind of ["artist", "track"] as const) {
      const stats = kind === "track" ? result.tracks : result.artists
      const total = await this.sources.count(kind)
      let done = 0
      let after: string | null = null
      for (;;) {
        const ids = await this.sources.ids(kind, after, EMBED_BATCH_SIZE)
        if (ids.length === 0) break
        add(
          stats,
          await withBackoff(() => this.sync(kind, ids, options), {
            attempts: RETRY_ATTEMPTS,
            baseDelayMs: RETRY_BASE_DELAY_MS,
            shouldRetry: (error) => error instanceof ServiceUnavailableException,
            onRetry: (_error, attempt, delayMs) => options.onRetry?.(attempt, delayMs),
            sleep: options.sleep,
          }),
        )
        done += ids.length
        after = ids[ids.length - 1]
        options.onProgress?.({
          kind,
          done,
          total,
          embedded: stats.embedded,
          unchanged: stats.unchanged,
        })
      }
    }
    return result
  }

  private requireProvider(): string {
    const { model } = this.embeddings
    if (!model) throw new ServiceUnavailableException("Semantic features are not configured")
    return model
  }

  private async sync(
    kind: EmbeddedKind,
    ids: readonly string[],
    { force = false }: SyncOptions,
  ): Promise<SyncStats> {
    const stats = emptyStats()
    const unique = [...new Set(ids)]
    if (unique.length === 0) return stats
    const model = this.requireProvider()

    const texts = await this.sources.texts(kind, unique)
    stats.gone = unique.length - texts.size
    const stored = await this.store.stored(kind, [...texts.keys()])

    const stale = [...texts]
      .map(([id, text]) => ({ id, text, hash: contentHash(text, model) }))
      .filter((item) => {
        const current = stored.get(item.id)
        return force || !current || current.contentHash !== item.hash || current.model !== model
      })
    stats.unchanged = texts.size - stale.length

    for (const batch of chunk(stale, EMBED_BATCH_SIZE)) {
      const vectors = await this.embeddings.embedDocuments(batch.map((item) => item.text))
      await this.store.save(
        kind,
        batch.map((item, index) => ({
          id: item.id,
          vector: vectors[index],
          model,
          contentHash: item.hash,
        })),
      )
      stats.embedded += batch.length
    }
    return stats
  }
}
