-- CreateEnum
CREATE TYPE "Region" AS ENUM ('VIETNAM', 'KOREA', 'JAPAN', 'CHINA', 'GLOBAL');

-- AlterTable
ALTER TABLE "Artist" ADD COLUMN     "region" "Region" NOT NULL DEFAULT 'GLOBAL';

-- AlterTable
ALTER TABLE "Track" ADD COLUMN     "youtubeVideoId" TEXT;

-- CreateIndex
CREATE INDEX "Artist_region_idx" ON "Artist"("region");
