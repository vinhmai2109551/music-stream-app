/** Public API of the embeddings module. Other modules must import from here only. */
export { EMBEDDING_DIMENSIONS, EMBEDDING_PROVIDER } from "./embedding-provider.js"
export type { EmbeddingKind, EmbeddingProvider } from "./embedding-provider.js"
export { EmbeddingsModule } from "./embeddings.module.js"
export { EmbeddingsService } from "./embeddings.service.js"
export { cosineSimilarity, normalize, parseVector, toVectorParam } from "./vector-math.js"
