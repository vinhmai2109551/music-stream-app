import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import type { Track } from "../../generated/prisma/client.js"
import type { Region } from "../../generated/prisma/enums.js"
import { PrismaService } from "../../infrastructure/prisma/prisma.service.js"
import { CatalogEvents, pageArgs, toPage, type Page } from "../../shared/index.js"
import { ArtistsService } from "../artists/index.js"
import { LikeKind, LikesService } from "../likes/index.js"
import { UploadsService } from "../uploads/index.js"
import { CreateTrackDto, ListTracksQueryDto, UpdateTrackDto } from "./dto/track.dto.js"
import { readPlayConfig } from "./tracks.config.js"

/** What the embeddings module needs to describe a track. */
export interface TrackEmbeddingSource {
  id: string
  title: string
  artist: string
  region: Region
  genres: string[]
  mood: string[]
  tags: string[]
  description: string
}

export interface TrackView {
  id: string
  title: string
  artist: string
  artistId: string
  cover: string
  /** Audio file in our storage; null when the track only plays through its YouTube video. */
  audioUrl: string | null
  plays: number
  /** Length in seconds. */
  duration: number
  /** Official YouTube video to play from; null when the track plays `audioUrl` instead. */
  youtubeVideoId: string | null
  genres: string[]
  mood: string[]
  tags: string[]
  /** A sentence or two about the style and mood of the song; never its lyrics. */
  description: string
  /** Language of the vocals (ISO 639 code); null = instrumental or unknown. */
  language: string | null
  likesCount: number
  liked: boolean
}

/** Result of `POST /tracks/:id/play`. */
export interface PlayResult {
  plays: number
  /** False when this listen was ignored because the user just played the track. */
  counted: boolean
}

@Injectable()
export class TracksService {
  private readonly playDedupeMs: number

  constructor(
    private readonly prisma: PrismaService,
    private readonly artists: ArtistsService,
    private readonly likes: LikesService,
    private readonly uploads: UploadsService,
    private readonly events: CatalogEvents,
    config: ConfigService,
  ) {
    this.playDedupeMs = readPlayConfig(config).dedupeMs
  }

  async list(query: ListTracksQueryDto, userId?: string): Promise<Page<TrackView>> {
    const where = {
      ...(query.artistId ? { artistId: query.artistId } : {}),
      ...(query.region ? { artist: { region: query.region } } : {}),
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: "insensitive" as const } },
              { artist: { name: { contains: query.q, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    }
    const [rows, total] = await Promise.all([
      this.prisma.track.findMany({
        where,
        orderBy: [{ plays: "desc" }, { title: "asc" }],
        ...pageArgs(query.page, query.limit),
      }),
      this.prisma.track.count({ where }),
    ])
    return toPage(await this.toViews(rows, userId), total, query.page, query.limit)
  }

  async get(id: string, userId?: string): Promise<TrackView> {
    const track = await this.prisma.track.findUnique({ where: { id } })
    if (!track) throw new NotFoundException("Track not found")
    return (await this.toViews([track], userId))[0]
  }

  /** Tracks the user liked, most recently liked first. */
  async listLiked(userId: string): Promise<TrackView[]> {
    const ids = await this.likes.likedIds(LikeKind.Tracks, userId)
    return this.getByIds(ids, userId)
  }

  /** For other modules: resolves ids to views, keeping the order of `ids` and skipping unknown ones. */
  async getByIds(ids: string[], userId?: string): Promise<TrackView[]> {
    const rows = await this.prisma.track.findMany({ where: { id: { in: [...new Set(ids)] } } })
    const views = await this.toViews(rows, userId)
    const byId = new Map(views.map((view) => [view.id, view]))
    return ids.flatMap((id) => byId.get(id) ?? [])
  }

  async create(dto: CreateTrackDto): Promise<TrackView> {
    this.assertPlayable(dto)
    this.uploads.assertManagedUrls({ coverUrl: dto.coverUrl, audioUrl: dto.audioUrl ?? undefined })
    const track = await this.prisma.track.create({ data: dto })
    this.events.changed({ kind: "track", id: track.id })
    return this.get(track.id)
  }

  async update(id: string, dto: UpdateTrackDto): Promise<TrackView> {
    this.uploads.assertManagedUrls({ coverUrl: dto.coverUrl, audioUrl: dto.audioUrl ?? undefined })
    if (dto.audioUrl !== undefined || dto.youtubeVideoId !== undefined) {
      const current = await this.prisma.track.findUnique({
        where: { id },
        select: { audioUrl: true, youtubeVideoId: true },
      })
      if (current) this.assertPlayable({ ...current, ...dto })
    }
    await this.prisma.track.update({ where: { id }, data: dto })
    this.events.changed({ kind: "track", id })
    return this.get(id)
  }

  /** For the embeddings module: the tracks that exist among `ids`, with their artist, by id. */
  async embeddingSources(ids: readonly string[]): Promise<Map<string, TrackEmbeddingSource>> {
    const rows = await this.prisma.track.findMany({ where: { id: { in: [...new Set(ids)] } } })
    const artists = await this.artists.embeddingSources(rows.map((row) => row.artistId))
    return new Map(
      rows.map((row) => [
        row.id,
        {
          id: row.id,
          title: row.title,
          artist: artists.get(row.artistId)?.name ?? "",
          region: artists.get(row.artistId)?.region ?? "GLOBAL",
          genres: row.genres,
          mood: row.mood,
          tags: row.tags,
          description: row.description,
        },
      ]),
    )
  }

  /** For the embeddings module: track ids in order, `limit` of them after `after`. */
  async listIds(after: string | null, limit: number): Promise<string[]> {
    const rows = await this.prisma.track.findMany({
      where: after ? { id: { gt: after } } : {},
      orderBy: { id: "asc" },
      take: limit,
      select: { id: true },
    })
    return rows.map((row) => row.id)
  }

  async idsOfArtist(artistId: string): Promise<string[]> {
    const rows = await this.prisma.track.findMany({ where: { artistId }, select: { id: true } })
    return rows.map((row) => row.id)
  }

  count(): Promise<number> {
    return this.prisma.track.count()
  }

  async remove(id: string): Promise<void> {
    await this.prisma.track.delete({ where: { id } })
  }

  /**
   * Counts one listen by `userId`. The same user playing the same track again within the dedupe
   * window answers `counted: false`, so replaying cannot inflate the number.
   */
  async recordPlay(userId: string, id: string): Promise<PlayResult> {
    const track = await this.prisma.track.findUnique({ where: { id }, select: { id: true } })
    if (!track) throw new NotFoundException("Track not found")

    return this.prisma.$transaction(async (tx) => {
      // One request at a time per (user, track): otherwise two parallel ones both see "no recent
      // listen" and both count. The lock is released when the transaction ends.
      const lockKey = `${userId}:${id}`
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`

      const since = new Date(Date.now() - this.playDedupeMs)
      const recent = await tx.playEvent.findFirst({
        where: { userId, trackId: id, createdAt: { gt: since } },
        select: { id: true },
      })
      if (recent) {
        const current = await tx.track.findUniqueOrThrow({ where: { id }, select: { plays: true } })
        return { plays: current.plays, counted: false }
      }

      await tx.playEvent.create({ data: { userId, trackId: id } })
      const updated = await tx.track.update({
        where: { id },
        data: { plays: { increment: 1 } },
        select: { plays: true },
      })
      return { plays: updated.plays, counted: true }
    })
  }

  /** A track nobody can play (no audio file and no YouTube video) is a data mistake. */
  private assertPlayable(source: { audioUrl?: string | null; youtubeVideoId?: string | null }) {
    if (!source.audioUrl && !source.youtubeVideoId) {
      throw new BadRequestException("A track needs an audioUrl or a youtubeVideoId to be played")
    }
  }

  private async toViews(rows: Track[], userId?: string): Promise<TrackView[]> {
    const ids = rows.map((row) => row.id)
    const [artists, counts, liked] = await Promise.all([
      this.artists.getSummaries(rows.map((row) => row.artistId)),
      this.likes.counts(LikeKind.Tracks, ids),
      this.likes.likedSet(LikeKind.Tracks, userId, ids),
    ])
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      artist: artists.get(row.artistId)?.name ?? "Unknown artist",
      artistId: row.artistId,
      cover: row.coverUrl,
      audioUrl: row.audioUrl,
      plays: row.plays,
      duration: row.durationSec,
      youtubeVideoId: row.youtubeVideoId,
      genres: row.genres,
      mood: row.mood,
      tags: row.tags,
      description: row.description,
      language: row.language,
      likesCount: counts.get(row.id) ?? 0,
      liked: liked.has(row.id),
    }))
  }
}
