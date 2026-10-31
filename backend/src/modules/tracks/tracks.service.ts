import { Injectable, NotFoundException } from "@nestjs/common"
import type { Track } from "../../generated/prisma/client.js"
import { PrismaService } from "../../infrastructure/prisma/prisma.service.js"
import { pageArgs, toPage, type Page } from "../../shared/index.js"
import { ArtistsService } from "../artists/index.js"
import { LikeKind, LikesService } from "../likes/index.js"
import { UploadsService } from "../uploads/index.js"
import { CreateTrackDto, ListTracksQueryDto, UpdateTrackDto } from "./dto/track.dto.js"

export interface TrackView {
  id: string
  title: string
  artist: string
  artistId: string
  cover: string
  audioUrl: string
  plays: number
  /** Length in seconds. */
  duration: number
  /** Official YouTube video to play from; null when the track plays `audioUrl` instead. */
  youtubeVideoId: string | null
  likesCount: number
  liked: boolean
}

@Injectable()
export class TracksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly artists: ArtistsService,
    private readonly likes: LikesService,
    private readonly uploads: UploadsService,
  ) {}

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
    this.uploads.assertManagedUrls({ coverUrl: dto.coverUrl, audioUrl: dto.audioUrl })
    const track = await this.prisma.track.create({ data: dto })
    return this.get(track.id)
  }

  async update(id: string, dto: UpdateTrackDto): Promise<TrackView> {
    this.uploads.assertManagedUrls({ coverUrl: dto.coverUrl, audioUrl: dto.audioUrl })
    await this.prisma.track.update({ where: { id }, data: dto })
    return this.get(id)
  }

  async remove(id: string): Promise<void> {
    await this.prisma.track.delete({ where: { id } })
  }

  async recordPlay(id: string): Promise<{ plays: number }> {
    const track = await this.prisma.track.update({
      where: { id },
      data: { plays: { increment: 1 } },
      select: { plays: true },
    })
    return track
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
      likesCount: counts.get(row.id) ?? 0,
      liked: liked.has(row.id),
    }))
  }
}
