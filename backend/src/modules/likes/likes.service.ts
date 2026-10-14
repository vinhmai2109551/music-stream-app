import { Injectable } from "@nestjs/common"
import { PrismaService } from "../../infrastructure/prisma/prisma.service.js"

export enum LikeKind {
  Tracks = "tracks",
  Albums = "albums",
  Playlists = "playlists",
}

/** Owns the Track/Album/Playlist like tables; knows nothing else about those entities. */
@Injectable()
export class LikesService {
  constructor(private readonly prisma: PrismaService) {}

  async like(kind: LikeKind, userId: string, targetId: string): Promise<void> {
    switch (kind) {
      case LikeKind.Tracks:
        await this.prisma.trackLike.upsert({
          where: { userId_trackId: { userId, trackId: targetId } },
          create: { userId, trackId: targetId },
          update: {},
        })
        break
      case LikeKind.Albums:
        await this.prisma.albumLike.upsert({
          where: { userId_albumId: { userId, albumId: targetId } },
          create: { userId, albumId: targetId },
          update: {},
        })
        break
      case LikeKind.Playlists:
        await this.prisma.playlistLike.upsert({
          where: { userId_playlistId: { userId, playlistId: targetId } },
          create: { userId, playlistId: targetId },
          update: {},
        })
        break
    }
  }

  async unlike(kind: LikeKind, userId: string, targetId: string): Promise<void> {
    switch (kind) {
      case LikeKind.Tracks:
        await this.prisma.trackLike.deleteMany({ where: { userId, trackId: targetId } })
        break
      case LikeKind.Albums:
        await this.prisma.albumLike.deleteMany({ where: { userId, albumId: targetId } })
        break
      case LikeKind.Playlists:
        await this.prisma.playlistLike.deleteMany({ where: { userId, playlistId: targetId } })
        break
    }
  }

  /** Ids the user liked, most recent first. */
  async likedIds(kind: LikeKind, userId: string): Promise<string[]> {
    const orderBy = { createdAt: "desc" } as const
    switch (kind) {
      case LikeKind.Tracks: {
        const rows = await this.prisma.trackLike.findMany({ where: { userId }, orderBy })
        return rows.map((row) => row.trackId)
      }
      case LikeKind.Albums: {
        const rows = await this.prisma.albumLike.findMany({ where: { userId }, orderBy })
        return rows.map((row) => row.albumId)
      }
      case LikeKind.Playlists: {
        const rows = await this.prisma.playlistLike.findMany({ where: { userId }, orderBy })
        return rows.map((row) => row.playlistId)
      }
    }
  }

  /** Which of `ids` the user liked. Anonymous users liked nothing. */
  async likedSet(kind: LikeKind, userId: string | undefined, ids: string[]): Promise<Set<string>> {
    if (!userId || ids.length === 0) return new Set()
    switch (kind) {
      case LikeKind.Tracks: {
        const rows = await this.prisma.trackLike.findMany({
          where: { userId, trackId: { in: ids } },
        })
        return new Set(rows.map((row) => row.trackId))
      }
      case LikeKind.Albums: {
        const rows = await this.prisma.albumLike.findMany({
          where: { userId, albumId: { in: ids } },
        })
        return new Set(rows.map((row) => row.albumId))
      }
      case LikeKind.Playlists: {
        const rows = await this.prisma.playlistLike.findMany({
          where: { userId, playlistId: { in: ids } },
        })
        return new Set(rows.map((row) => row.playlistId))
      }
    }
  }

  /** Like counts per id (id -> count); ids without likes are absent. */
  async counts(kind: LikeKind, ids: string[]): Promise<Map<string, number>> {
    if (ids.length === 0) return new Map()
    switch (kind) {
      case LikeKind.Tracks: {
        const rows = await this.prisma.trackLike.groupBy({
          by: ["trackId"],
          where: { trackId: { in: ids } },
          _count: { _all: true },
        })
        return new Map(rows.map((row) => [row.trackId, row._count._all]))
      }
      case LikeKind.Albums: {
        const rows = await this.prisma.albumLike.groupBy({
          by: ["albumId"],
          where: { albumId: { in: ids } },
          _count: { _all: true },
        })
        return new Map(rows.map((row) => [row.albumId, row._count._all]))
      }
      case LikeKind.Playlists: {
        const rows = await this.prisma.playlistLike.groupBy({
          by: ["playlistId"],
          where: { playlistId: { in: ids } },
          _count: { _all: true },
        })
        return new Map(rows.map((row) => [row.playlistId, row._count._all]))
      }
    }
  }
}
