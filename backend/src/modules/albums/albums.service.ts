import { Injectable, NotFoundException } from "@nestjs/common"
import type { Album, AlbumTrack } from "../../generated/prisma/client.js"
import { PrismaService } from "../../infrastructure/prisma/prisma.service.js"
import { pageArgs, toPage, type Page } from "../../shared/index.js"
import { ArtistsService } from "../artists/index.js"
import { LikeKind, LikesService } from "../likes/index.js"
import { TracksService, type TrackView } from "../tracks/index.js"
import { UploadsService } from "../uploads/index.js"
import { CreateAlbumDto, ListAlbumsQueryDto, UpdateAlbumDto } from "./dto/album.dto.js"

type AlbumRow = Album & { tracks: Pick<AlbumTrack, "trackId" | "position">[] }

export interface AlbumView {
  id: string
  title: string
  artist: string
  artistId: string
  cover: string
  trackIds: string[]
  likesCount: number
  liked: boolean
}

export interface AlbumDetail extends AlbumView {
  tracks: TrackView[]
}

const include = {
  tracks: { select: { trackId: true, position: true }, orderBy: { position: "asc" } },
} as const

@Injectable()
export class AlbumsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly artists: ArtistsService,
    private readonly tracks: TracksService,
    private readonly likes: LikesService,
    private readonly uploads: UploadsService,
  ) {}

  async list(query: ListAlbumsQueryDto, userId?: string): Promise<Page<AlbumView>> {
    const where = {
      ...(query.artistId ? { artistId: query.artistId } : {}),
      ...(query.q ? { title: { contains: query.q, mode: "insensitive" as const } } : {}),
    }
    const [rows, total] = await Promise.all([
      this.prisma.album.findMany({
        where,
        include,
        orderBy: { title: "asc" },
        ...pageArgs(query.page, query.limit),
      }),
      this.prisma.album.count({ where }),
    ])
    return toPage(await this.toViews(rows, userId), total, query.page, query.limit)
  }

  async get(id: string, userId?: string): Promise<AlbumDetail> {
    const row = await this.prisma.album.findUnique({ where: { id }, include })
    if (!row) throw new NotFoundException("Album not found")
    const [view] = await this.toViews([row], userId)
    const tracks = await this.tracks.getByIds(view.trackIds, userId)
    return { ...view, tracks }
  }

  /** Albums the user liked, most recently liked first. */
  async listLiked(userId: string): Promise<AlbumView[]> {
    const ids = await this.likes.likedIds(LikeKind.Albums, userId)
    const rows = await this.prisma.album.findMany({ where: { id: { in: ids } }, include })
    const views = await this.toViews(rows, userId)
    return ids.flatMap((id) => views.find((view) => view.id === id) ?? [])
  }

  async create(dto: CreateAlbumDto): Promise<AlbumDetail> {
    this.uploads.assertManagedUrls({ coverUrl: dto.coverUrl })
    const { trackIds = [], ...data } = dto
    const album = await this.prisma.album.create({
      data: {
        ...data,
        tracks: { create: trackIds.map((trackId, position) => ({ trackId, position })) },
      },
    })
    return this.get(album.id)
  }

  async update(id: string, dto: UpdateAlbumDto): Promise<AlbumDetail> {
    this.uploads.assertManagedUrls({ coverUrl: dto.coverUrl })
    const { trackIds, ...data } = dto
    await this.prisma.$transaction(async (tx) => {
      await tx.album.update({ where: { id }, data })
      if (trackIds) {
        await tx.albumTrack.deleteMany({ where: { albumId: id } })
        await tx.albumTrack.createMany({
          data: trackIds.map((trackId, position) => ({ albumId: id, trackId, position })),
        })
      }
    })
    return this.get(id)
  }

  async remove(id: string): Promise<void> {
    await this.prisma.album.delete({ where: { id } })
  }

  private async toViews(rows: AlbumRow[], userId?: string): Promise<AlbumView[]> {
    const ids = rows.map((row) => row.id)
    const [artists, counts, liked] = await Promise.all([
      this.artists.getSummaries(rows.map((row) => row.artistId)),
      this.likes.counts(LikeKind.Albums, ids),
      this.likes.likedSet(LikeKind.Albums, userId, ids),
    ])
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      artist: artists.get(row.artistId)?.name ?? "Unknown artist",
      artistId: row.artistId,
      cover: row.coverUrl,
      trackIds: row.tracks.map((track) => track.trackId),
      likesCount: counts.get(row.id) ?? 0,
      liked: liked.has(row.id),
    }))
  }
}
