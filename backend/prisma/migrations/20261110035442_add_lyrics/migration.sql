-- Prisma also proposed `DROP INDEX` for the three *_embedding_hnsw indexes (it cannot express an HNSW
-- index on a pgvector column); they are removed here on purpose, as in 20261107161213_add_search_names.

-- CreateTable
CREATE TABLE "TrackLyrics" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "lines" TEXT[],
    "timingsMs" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "source" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrackLyrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackLyricsTranslation" (
    "id" TEXT NOT NULL,
    "lyricsId" TEXT NOT NULL,
    "targetLanguage" TEXT NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "lines" TEXT[],
    "provider" TEXT NOT NULL,
    "billedCharacters" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackLyricsTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TrackLyrics_trackId_key" ON "TrackLyrics"("trackId");

-- CreateIndex
CREATE UNIQUE INDEX "TrackLyricsTranslation_lyricsId_targetLanguage_sourceHash_key" ON "TrackLyricsTranslation"("lyricsId", "targetLanguage", "sourceHash");

-- AddForeignKey
ALTER TABLE "TrackLyrics" ADD CONSTRAINT "TrackLyrics_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackLyricsTranslation" ADD CONSTRAINT "TrackLyricsTranslation_lyricsId_fkey" FOREIGN KEY ("lyricsId") REFERENCES "TrackLyrics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
