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
  /** How many vectors there are; with `model`, only those made by that model. */
  count(kind: EmbeddedKind, model?: string): Promise<number>
  /** The stored vectors of the ids that have one. */
  vectorsOf(kind: EmbeddedKind, ids: readonly string[]): Promise<Map<string, number[]>>
  /**
   * The ids whose vectors are closest to `vector` by cosine distance (0 = the same direction, 2 =
   * opposite), nearest first. With `only`, just those ids are looked at.
   */
  nearest(
    kind: EmbeddedKind,
    vector: readonly number[],
    limit: number,
    only?: readonly string[],
  ): Promise<NearestHit[]>
}

export interface NearestHit {
  id: string
  /** Cosine distance to the vector asked for. */
  distance: number
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

/** A chunk of a help text, ready to be stored. */
export interface KnowledgeRow {
  source: string
  heading: string
  position: number
  content: string
  vector: readonly number[]
  model: string
  contentHash: string
}

/** A chunk found by `KnowledgeStore.nearest`. */
export interface KnowledgeHit {
  source: string
  heading: string
  position: number
  content: string
  /** Cosine distance to the question (0 = the same direction). */
  distance: number
}

/** Where the vectors of the help texts are kept (PostgreSQL with pgvector). */
export interface KnowledgeStore {
  /** The model and hash stored for each chunk of `source`, by position. */
  stored(source: string): Promise<Map<number, StoredEmbedding>>
  /** Inserts or replaces chunks (a chunk is identified by its source and position). */
  save(rows: readonly KnowledgeRow[]): Promise<void>
  /** Deletes the chunks of `source` from `fromPosition` on (the file became shorter). */
  deleteFrom(source: string, fromPosition: number): Promise<number>
  /** Deletes the chunks of every source that is not in `sources` (the file was deleted). */
  deleteSourcesNotIn(sources: readonly string[]): Promise<number>
  /** The chunks closest to `vector`; only those made by `model` (vectors of another model mean nothing). */
  nearest(vector: readonly number[], limit: number, model: string): Promise<KnowledgeHit[]>
  count(): Promise<number>
}

/** A help file as read from disk. */
export interface KnowledgeFile {
  /** File name, e.g. "premium.md". */
  name: string
  text: string
}

export const KNOWLEDGE_STORE = "KNOWLEDGE_STORE"
/** A function that reads the help files; replaceable in tests. */
export const KNOWLEDGE_FILES = "KNOWLEDGE_FILES"

/** Injection tokens. */
export const EMBEDDING_STORE = "EMBEDDING_STORE"
export const CATALOG_SOURCES = "CATALOG_SOURCES"
