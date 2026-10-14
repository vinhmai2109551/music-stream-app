import { Injectable } from "@nestjs/common"
import { PrismaService } from "../../infrastructure/prisma/prisma.service.js"

@Injectable()
export class FollowsService {
  constructor(private readonly prisma: PrismaService) {}

  async follow(userId: string, artistId: string): Promise<void> {
    await this.prisma.follow.upsert({
      where: { userId_artistId: { userId, artistId } },
      create: { userId, artistId },
      update: {},
    })
  }

  async unfollow(userId: string, artistId: string): Promise<void> {
    await this.prisma.follow.deleteMany({ where: { userId, artistId } })
  }

  /** Artists the user follows, most recent first. */
  async followedArtistIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.follow.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { artistId: true },
    })
    return rows.map((row) => row.artistId)
  }

  /** Which of `artistIds` the user follows. Anonymous users follow nothing. */
  async followedSet(userId: string | undefined, artistIds: string[]): Promise<Set<string>> {
    if (!userId || artistIds.length === 0) return new Set()
    const rows = await this.prisma.follow.findMany({
      where: { userId, artistId: { in: artistIds } },
      select: { artistId: true },
    })
    return new Set(rows.map((row) => row.artistId))
  }

  /** Number of real follows per artist (artistId -> count). */
  async countByArtist(artistIds: string[]): Promise<Map<string, number>> {
    if (artistIds.length === 0) return new Map()
    const rows = await this.prisma.follow.groupBy({
      by: ["artistId"],
      where: { artistId: { in: artistIds } },
      _count: { _all: true },
    })
    return new Map(rows.map((row) => [row.artistId, row._count._all]))
  }
}
