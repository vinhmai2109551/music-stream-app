import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common"
import { bufferTime, concatMap, filter, from, type Subscription } from "rxjs"
import { CatalogEvents, type CatalogChange } from "../../shared/events/catalog-events.js"
import { EmbeddingIndexService } from "./embedding-index.service.js"
import { EmbeddingsService } from "./embeddings.service.js"

/** Changes that arrive within this time are handled together (an admin often edits twice in a row). */
export const SYNC_DEBOUNCE_MS = 300

/**
 * After a track or artist is created or changed, makes its vector in the background. The request
 * that changed it has long been answered; if the embedding service is down this only writes a
 * warning, and `npm run ai:embed` catches up later.
 */
@Injectable()
export class CatalogSyncListener implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CatalogSyncListener.name)
  private subscription: Subscription | null = null

  constructor(
    private readonly events: CatalogEvents,
    private readonly index: EmbeddingIndexService,
    private readonly embeddings: EmbeddingsService,
  ) {}

  onModuleInit(): void {
    if (!this.embeddings.enabled) return
    this.subscription = this.events.changes$
      .pipe(
        bufferTime(SYNC_DEBOUNCE_MS),
        filter((changes) => changes.length > 0),
        // One batch at a time, in the order the changes happened.
        concatMap((changes) => from(this.handle(changes))),
      )
      .subscribe()
  }

  onModuleDestroy(): void {
    this.subscription?.unsubscribe()
  }

  /** Never throws: a failure here must not touch anything but the log. */
  async handle(changes: readonly CatalogChange[]): Promise<void> {
    const ids = (kind: CatalogChange["kind"]) => [
      ...new Set(changes.filter((change) => change.kind === kind).map((change) => change.id)),
    ]
    try {
      const artistIds = ids("artist")
      if (artistIds.length > 0) {
        await this.index.syncArtists(artistIds)
        for (const artistId of artistIds) await this.index.syncTracksOfArtist(artistId)
      }
      const trackIds = ids("track")
      if (trackIds.length > 0) await this.index.syncTracks(trackIds)
    } catch (error) {
      this.logger.warn(`Could not update embeddings: ${(error as Error).message}`)
    }
  }
}
