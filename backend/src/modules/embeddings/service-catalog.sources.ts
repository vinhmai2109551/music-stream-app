import { Injectable } from "@nestjs/common"
import { ArtistsService } from "../artists/index.js"
import { TracksService } from "../tracks/index.js"
import { artistEmbeddingText, trackEmbeddingText } from "./embedding-text.js"
import type { CatalogSources, EmbeddedKind } from "./ports.js"

/** The catalog as the embeddings see it, read through the services of the modules that own it. */
@Injectable()
export class ServiceCatalogSources implements CatalogSources {
  constructor(
    private readonly tracks: TracksService,
    private readonly artists: ArtistsService,
  ) {}

  async texts(kind: EmbeddedKind, ids: readonly string[]): Promise<Map<string, string>> {
    if (kind === "track") {
      const sources = await this.tracks.embeddingSources(ids)
      return new Map([...sources].map(([id, source]) => [id, trackEmbeddingText(source)]))
    }
    const sources = await this.artists.embeddingSources(ids)
    return new Map(
      [...sources].map(([id, source]) => [
        id,
        artistEmbeddingText({
          name: source.name,
          region: source.region,
          genres: source.genres,
          bio: source.bio,
        }),
      ]),
    )
  }

  ids(kind: EmbeddedKind, after: string | null, limit: number): Promise<string[]> {
    return kind === "track" ? this.tracks.listIds(after, limit) : this.artists.listIds(after, limit)
  }

  idsOfArtist(artistId: string): Promise<string[]> {
    return this.tracks.idsOfArtist(artistId)
  }

  count(kind: EmbeddedKind): Promise<number> {
    return kind === "track" ? this.tracks.count() : this.artists.count()
  }
}
