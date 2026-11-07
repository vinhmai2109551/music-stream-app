/** What the text is for: a stored document, or a question asked against the stored documents. */
export type EmbeddingKind = "document" | "query"

/**
 * Turns texts into vectors. The vector columns in the database are `vector(EMBEDDING_DIMENSIONS)`,
 * so every provider must return exactly that many numbers, and vectors of different `model`s must
 * never be compared with each other.
 */
export interface EmbeddingProvider {
  /** Identifies the vectors: it is stored next to them and decides when they are made again. */
  readonly model: string
  readonly dimensions: number
  /** One vector per text, in the same order. Rejects when the service cannot be reached. */
  embed(texts: readonly string[], kind: EmbeddingKind): Promise<number[][]>
}

/**
 * Length of every stored vector. It is part of the database schema (`vector(768)`): changing it
 * needs a migration and makes all stored embeddings useless. 768 is a size Google recommends for
 * gemini-embedding-2 and stays below the 2000 dimensions an HNSW index on `vector` can take.
 */
export const EMBEDDING_DIMENSIONS = 768

/** Injection token of the provider (`EmbeddingProvider`, or null while none is configured). */
export const EMBEDDING_PROVIDER = "EMBEDDING_PROVIDER"
