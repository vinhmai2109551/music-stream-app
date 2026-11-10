-- AlterTable
ALTER TABLE "Artist" ADD COLUMN     "genres" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Track" ADD COLUMN     "description" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "genres" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "language" TEXT,
ADD COLUMN     "mood" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
