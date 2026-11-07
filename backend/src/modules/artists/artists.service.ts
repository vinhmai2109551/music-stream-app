import { Injectable, NotFoundException } from "@nestjs/common"
import type { Artist } from "../../generated/prisma/client.js"
import type { Region } from "../../generated/prisma/enums.js"
import { PrismaService } from "../../infrastructure/prisma/prisma.service.js"
import { CatalogEvents, pageArgs, toPage, type Page } from "../../shared/index.js"
import { FollowsService } from "../follows/index.js"
import { UploadsService } from "../uploads/index.js"
import { CreateArtistDto, ListArtistsQueryDto, UpdateArtistDto } from "./dto/artist.dto.js"

/** What the embeddings module needs to describe an artist (and to describe their tracks). */
export interface ArtistEmbeddingSource {
  id: string
  name: string
  region: Region
  bio: string
  genres: string[]
}

export interface ArtistView {
  id: string
  name: string
  bio: string
  image: string
  region: Region
  genres: string[]
  followers: number
  followed: boolean
}

/** Light artist data that other modules embed in their own responses. */
export interface ArtistSummary {
  id: string
  name: string
  image: string
}

@Injectable()
export class ArtistsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly follows: FollowsService,
    private readonly uploads: UploadsService,
    private readonly events: CatalogEvents,
  ) {}

  async list(query: ListArtistsQueryDto, userId?: string): Promise<Page<ArtistView>> {
    const where = {
      ...(query.q ? { name: { contains: query.q, mode: "insensitive" as const } } : {}),
      ...(query.region ? { region: query.region } : {}),
    }
    const [rows, total] = await Promise.all([
      this.prisma.artist.findMany({
        where,
        orderBy: { name: "asc" },
        ...pageArgs(query.page, query.limit),
      }),
      this.prisma.artist.count({ where }),
    ])
    return toPage(await this.toViews(rows, userId), total, query.page, query.limit)
  }

  async get(id: string, userId?: string): Promise<ArtistView> {
    const artist = await this.prisma.artist.findUnique({ where: { id } })
    if (!artist) throw new NotFoundException("Artist not found")
    return (await this.toViews([artist], userId))[0]
  }

  /** Artists the user follows, most recently followed first. */
  async listFollowed(userId: string): Promise<ArtistView[]> {
    const ids = await this.follows.followedArtistIds(userId)
    const rows = await this.prisma.artist.findMany({ where: { id: { in: ids } } })
    const views = await this.toViews(rows, userId)
    return ids.flatMap((id) => views.find((view) => view.id === id) ?? [])
  }

  async create(dto: CreateArtistDto): Promise<Artist> {
    this.uploads.assertManagedUrls({ imageUrl: dto.imageUrl })
    const artist = await this.prisma.artist.create({ data: dto })
    this.events.changed({ kind: "artist", id: artist.id })
    return artist
  }

  async update(id: string, dto: UpdateArtistDto): Promise<Artist> {
    this.uploads.assertManagedUrls({ imageUrl: dto.imageUrl })
    const artist = await this.prisma.artist.update({ where: { id }, data: dto })
    this.events.changed({ kind: "artist", id })
    return artist
  }

  async remove(id: string): Promise<void> {
    await this.prisma.artist.delete({ where: { id } })
  }

  /** For the embeddings module: the artists that exist among `ids`, by id. */
  async embeddingSources(ids: readonly string[]): Promise<Map<string, ArtistEmbeddingSource>> {
    const rows = await this.prisma.artist.findMany({ where: { id: { in: [...new Set(ids)] } } })
    return new Map(
      rows.map((row) => [
        row.id,
        { id: row.id, name: row.name, region: row.region, bio: row.bio, genres: row.genres },
      ]),
    )
  }

  /** For the embeddings module: artist ids in order, `limit` of them after `after`. */
  async listIds(after: string | null, limit: number): Promise<string[]> {
    const rows = await this.prisma.artist.findMany({
      where: after ? { id: { gt: after } } : {},
      orderBy: { id: "asc" },
      take: limit,
      select: { id: true },
    })
    return rows.map((row) => row.id)
  }

  count(): Promise<number> {
    return this.prisma.artist.count()
  }

  /** For other modules: id -> {id, name, image}. Unknown ids are absent. */
  async getSummaries(ids: string[]): Promise<Map<string, ArtistSummary>> {
    const rows = await this.prisma.artist.findMany({ where: { id: { in: [...new Set(ids)] } } })
    return new Map(rows.map((row) => [row.id, { id: row.id, name: row.name, image: row.imageUrl }]))
  }

  private async toViews(rows: Artist[], userId?: string): Promise<ArtistView[]> {
    const ids = rows.map((row) => row.id)
    const [counts, followed] = await Promise.all([
      this.follows.countByArtist(ids),
      this.follows.followedSet(userId, ids),
    ])
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      bio: row.bio,
      image: row.imageUrl,
      region: row.region,
      genres: row.genres,
      followers: row.baseFollowers + (counts.get(row.id) ?? 0),
      followed: followed.has(row.id),
    }))
  }
}
