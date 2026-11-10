import { Global, Injectable, Module } from "@nestjs/common"
import { Subject, type Observable } from "rxjs"

/** A track or an artist was created or changed. */
export interface CatalogChange {
  kind: "track" | "artist"
  id: string
}

/**
 * A one-way channel from the modules that own catalog data to the ones that keep data derived from
 * it (the embeddings). It lets `tracks` announce a change without importing the module that reacts
 * to it, so the module graph stays free of cycles. In-process only: nothing is delivered after a
 * restart, which is why `npm run ai:embed` can always catch up.
 */
@Injectable()
export class CatalogEvents {
  private readonly subject = new Subject<CatalogChange>()
  readonly changes$: Observable<CatalogChange> = this.subject.asObservable()

  changed(change: CatalogChange): void {
    this.subject.next(change)
  }
}

@Global()
@Module({ providers: [CatalogEvents], exports: [CatalogEvents] })
export class CatalogEventsModule {}
