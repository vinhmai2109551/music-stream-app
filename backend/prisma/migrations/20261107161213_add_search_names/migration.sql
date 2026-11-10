-- AlterTable
ALTER TABLE "Album" ADD COLUMN     "searchName" TEXT;

-- AlterTable
ALTER TABLE "Artist" ADD COLUMN     "searchName" TEXT;

-- AlterTable
ALTER TABLE "Playlist" ADD COLUMN     "searchName" TEXT;

-- AlterTable
ALTER TABLE "Track" ADD COLUMN     "searchName" TEXT;

-- Prisma generated `DROP INDEX "TrackEmbedding_embedding_hnsw"` and `DROP INDEX
-- "ArtistEmbedding_embedding_hnsw"` here, because it cannot express an HNSW index on a pgvector
-- column and so thinks they are stray. They are removed on purpose: the vector search needs them.
-- Do the same whenever `prisma migrate dev` proposes to drop an index ending in `_hnsw` (a test
-- fails if a migration does).
