export type EmbeddedKind = "track" | "artist"

/** What is stored next to a vector: enough to tell whether it is still up to date. */
export interface StoredEmbedding {
  model: string
  contentHash: string
}

export interface EmbeddingRow {
  id: string
  vector: readonly number[]
  model: string
  contentHash: string
}

/** Where the vectors are kept (PostgreSQL with pgvector). */
export interface EmbeddingStore {
  /** The stored model and hash for the ids that have a vector. */
  stored(kind: EmbeddedKind, ids: readonly string[]): Promise<Map<string, StoredEmbedding>>
  /** Inserts or replaces vectors. A row whose track or artist no longer exists is skipped. */
  save(kind: EmbeddedKind, rows: readonly EmbeddingRow[]): Promise<void>
  count(kind: EmbeddedKind): Promise<number>
}

/** Where the text to embed comes from (the tracks and artists modules). */
export interface CatalogSources {
  /** Text of each id that still exists; an id missing from the map was deleted. */
  texts(kind: EmbeddedKind, ids: readonly string[]): Promise<Map<string, string>>
  /** Ids in order, `limit` of them after `after` (null = from the start). */
  ids(kind: EmbeddedKind, after: string | null, limit: number): Promise<string[]>
  idsOfArtist(artistId: string): Promise<string[]>
  count(kind: EmbeddedKind): Promise<number>
}

/** Injection tokens. */
export const EMBEDDING_STORE = "EMBEDDING_STORE"
export const CATALOG_SOURCES = "CATALOG_SOURCES"
