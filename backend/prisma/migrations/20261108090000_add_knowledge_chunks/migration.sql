-- CreateTable
CREATE TABLE "KnowledgeChunk" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "heading" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(768) NOT NULL,
    "model" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeChunk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KnowledgeChunk_source_idx" ON "KnowledgeChunk"("source");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeChunk_source_position_key" ON "KnowledgeChunk"("source", "position");

-- HNSW index for nearest-neighbour search by cosine distance (`<=>`), written by hand because
-- Prisma cannot express an index on a pgvector column (same as the track and artist vectors).
CREATE INDEX "KnowledgeChunk_embedding_hnsw" ON "KnowledgeChunk" USING hnsw ("embedding" vector_cosine_ops);
