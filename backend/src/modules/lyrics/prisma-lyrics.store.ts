import { Injectable } from "@nestjs/common"
import { PrismaService } from "../../infrastructure/prisma/prisma.service.js"
import type {
  LyricsInput,
  LyricsStore,
  StoredLyrics,
  StoredTranslation,
  TranslationInput,
} from "./ports.js"

@Injectable()
export class PrismaLyricsStore implements LyricsStore {
  constructor(private readonly prisma: PrismaService) {}

  findLyrics(trackId: string): Promise<StoredLyrics | null> {
    return this.prisma.trackLyrics.findUnique({ where: { trackId } })
  }

  async findStatuses(trackIds: readonly string[]): Promise<{ trackId: string; timed: boolean }[]> {
    const rows = await this.prisma.trackLyrics.findMany({
      where: { trackId: { in: [...trackIds] } },
      select: { trackId: true, timingsMs: true },
    })
    return rows.map((row) => ({ trackId: row.trackId, timed: row.timingsMs.length > 0 }))
  }

  upsertLyrics(input: LyricsInput): Promise<StoredLyrics> {
    const { trackId, ...data } = input
    return this.prisma.trackLyrics.upsert({
      where: { trackId },
      create: { trackId, ...data },
      update: data,
    })
  }

  async deleteStaleTranslations(lyricsId: string, currentHash: string): Promise<void> {
    await this.prisma.trackLyricsTranslation.deleteMany({
      where: { lyricsId, sourceHash: { not: currentHash } },
    })
  }

  findTranslation(
    lyricsId: string,
    targetLanguage: string,
    sourceHash: string,
  ): Promise<StoredTranslation | null> {
    return this.prisma.trackLyricsTranslation.findUnique({
      where: { lyricsId_targetLanguage_sourceHash: { lyricsId, targetLanguage, sourceHash } },
    })
  }

  async saveTranslation(input: TranslationInput): Promise<StoredTranslation> {
    // The unique key (lyrics, language, version) decides a race: the second insert is skipped and
    // both callers read the row the first one wrote.
    await this.prisma.trackLyricsTranslation.createMany({ data: [input], skipDuplicates: true })
    return this.prisma.trackLyricsTranslation.findUniqueOrThrow({
      where: {
        lyricsId_targetLanguage_sourceHash: {
          lyricsId: input.lyricsId,
          targetLanguage: input.targetLanguage,
          sourceHash: input.sourceHash,
        },
      },
    })
  }
}
