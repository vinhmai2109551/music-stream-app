-- CreateTable
CREATE TABLE "TrackEmbedding" (
    "trackId" TEXT NOT NULL,
    "embedding" vector(768) NOT NULL,
    "model" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackEmbedding_pkey" PRIMARY KEY ("trackId")
);

-- CreateTable
CREATE TABLE "ArtistEmbedding" (
    "artistId" TEXT NOT NULL,
    "embedding" vector(768) NOT NULL,
    "model" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArtistEmbedding_pkey" PRIMARY KEY ("artistId")
);

-- AddForeignKey
ALTER TABLE "TrackEmbedding" ADD CONSTRAINT "TrackEmbedding_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtistEmbedding" ADD CONSTRAINT "ArtistEmbedding_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- HNSW indexes for nearest-neighbour search by cosine distance (`<=>`). Prisma cannot express an
-- index on a pgvector column, so they are written here. m = 16 and ef_construction = 64 are
-- pgvector's defaults, plenty for a catalog of a few thousand items.
CREATE INDEX "TrackEmbedding_embedding_hnsw" ON "TrackEmbedding" USING hnsw ("embedding" vector_cosine_ops);

CREATE INDEX "ArtistEmbedding_embedding_hnsw" ON "ArtistEmbedding" USING hnsw ("embedding" vector_cosine_ops);
