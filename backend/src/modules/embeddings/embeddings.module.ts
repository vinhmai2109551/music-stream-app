import path from "node:path"
import { Module } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { ArtistsModule } from "../artists/index.js"
import { TracksModule } from "../tracks/index.js"
import { CatalogSyncListener } from "./catalog-sync.listener.js"
import { EmbeddingIndexService } from "./embedding-index.service.js"
import { createEmbeddingProvider } from "./create-provider.js"
import { EMBEDDING_PROVIDER } from "./embedding-provider.js"
import { EmbeddingsService } from "./embeddings.service.js"
import { CATALOG_SOURCES, EMBEDDING_STORE, KNOWLEDGE_FILES, KNOWLEDGE_STORE } from "./ports.js"
import { PrismaEmbeddingStore } from "./prisma-embedding.store.js"
import { ServiceCatalogSources } from "./service-catalog.sources.js"
import { KnowledgeIndexService } from "./knowledge-index.service.js"
import { DEFAULT_KNOWLEDGE_DIR, readKnowledgeFiles } from "./knowledge-files.js"
import { KnowledgeService } from "./knowledge.service.js"
import { PrismaKnowledgeStore } from "./prisma-knowledge.store.js"

/**
 * Text embeddings (vectors) for semantic search, recommendations and the assistant: the provider,
 * the vectors stored in PostgreSQL, and the work that keeps them up to date.
 */
@Module({
  imports: [TracksModule, ArtistsModule],
  providers: [
    { provide: EMBEDDING_PROVIDER, inject: [ConfigService], useFactory: createEmbeddingProvider },
    { provide: EMBEDDING_STORE, useClass: PrismaEmbeddingStore },
    { provide: CATALOG_SOURCES, useClass: ServiceCatalogSources },
    EmbeddingsService,
    EmbeddingIndexService,
    CatalogSyncListener,
    { provide: KNOWLEDGE_STORE, useClass: PrismaKnowledgeStore },
    {
      provide: KNOWLEDGE_FILES,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const dir = path.resolve(config.get<string>("KNOWLEDGE_DIR") || DEFAULT_KNOWLEDGE_DIR)
        return () => readKnowledgeFiles(dir)
      },
    },
    KnowledgeIndexService,
    KnowledgeService,
  ],
  exports: [
    EmbeddingsService,
    EmbeddingIndexService,
    EMBEDDING_STORE,
    KnowledgeIndexService,
    KnowledgeService,
  ],
})
export class EmbeddingsModule {}
