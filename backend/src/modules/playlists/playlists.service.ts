import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  type OnModuleInit,
} from "@nestjs/common"
import type { Playlist, PlaylistTrack } from "../../generated/prisma/client.js"
import { Role } from "../../generated/prisma/enums.js"
import { PrismaService } from "../../infrastructure/prisma/prisma.service.js"
import {
  pageArgs,
  toPage,
  type AuthUser,
  type Page,
  type PaginationQueryDto,
} from "../../shared/index.js"
import { backfillSearchNames } from "../../shared/text/backfill-search-names.js"
import { toSearchName } from "../../shared/text/search-name.js"
import { LikeKind, LikesService } from "../likes/index.js"
import { TracksService, type TrackView } from "../tracks/index.js"
import { UsersService } from "../users/index.js"
import { CreatePlaylistDto, UpdatePlaylistDto } from "./dto/playlist.dto.js"

const OFFICIAL_OWNER_NAME = "Music Stream"

type PlaylistRow = Playlist & { tracks: Pick<PlaylistTrack, "trackId" | "position">[] }

export interface PlaylistView {
  id: string
  name: string
  /** Display name of the owner ("Music Stream" for editorial playlists). */
  owner: string
  ownerId: string | null
  isOfficial: boolean
  description: string
  cover: string | null
  trackIds: string[]
  likesCount: number
  liked: boolean
}

export interface PlaylistDetail extends PlaylistView {
  tracks: TrackView[]
}

const include = {
  tracks: { select: { trackId: true, position: true }, orderBy: { position: "asc" } },
} as const

@Injectable()
export class PlaylistsService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tracks: TracksService,
    private readonly likes: LikesService,
    private readonly users: UsersService,
  ) {}

  /** Gives a search name to playlists that have none (made before the column, or written by SQL). */
  async onModuleInit(): Promise<void> {
    await backfillSearchNames({
      label: "playlists",
      read: async (take) =>
        (
          await this.prisma.playlist.findMany({
            where: { searchName: null },
            select: { id: true, name: true },
            take,
          })
        ).map((row) => ({ id: row.id, text: row.name })),
      write: async (rows) => {
        await this.prisma.$transaction(
          rows.map((row) =>
            this.prisma.playlist.update({
              where: { id: row.id },
              data: { searchName: row.searchName },
            }),
          ),
        )
      },
    })
  }

  /** Editorial playlists, visible to everyone. */
  async listOfficial(query: PaginationQueryDto, userId?: string): Promise<Page<PlaylistView>> {
    const needle = query.q ? toSearchName(query.q) : ""
    const where = {
      isOfficial: true,
      ...(query.q
        ? {
            OR: [
              ...(needle ? [{ searchName: { contains: needle } }] : []),
              { name: { contains: query.q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    }
    const [rows, total] = await Promise.all([
      this.prisma.playlist.findMany({
        where,
        include,
        orderBy: { createdAt: "asc" },
        ...pageArgs(query.page, query.limit),
      }),
      this.prisma.playlist.count({ where }),
    ])
    return toPage(await this.toViews(rows, userId), total, query.page, query.limit)
  }

  async listMine(userId: string): Promise<PlaylistView[]> {
    const rows = await this.prisma.playlist.findMany({
      where: { ownerId: userId },
      include,
      orderBy: { createdAt: "asc" },
    })
    return this.toViews(rows, userId)
  }

  /** Liked playlists the user is still allowed to see. */
  async listLiked(userId: string): Promise<PlaylistView[]> {
    const ids = await this.likes.likedIds(LikeKind.Playlists, userId)
    const rows = await this.prisma.playlist.findMany({
      where: { id: { in: ids }, OR: [{ isOfficial: true }, { ownerId: userId }] },
      include,
    })
    const views = await this.toViews(rows, userId)
    return ids.flatMap((id) => views.find((view) => view.id === id) ?? [])
  }

  async get(id: string, user: AuthUser | null): Promise<PlaylistDetail> {
    const row = await this.findReadable(id, user)
    const [view] = await this.toViews([row], user?.id)
    const tracks = await this.tracks.getByIds(view.trackIds, user?.id)
    return { ...view, tracks }
  }

  async create(user: AuthUser, dto: CreatePlaylistDto): Promise<PlaylistDetail> {
    if (dto.isOfficial && user.role !== Role.ADMIN) {
      throw new ForbiddenException("Only admins can create official playlists")
    }
    const playlist = await this.prisma.playlist.create({
      data: {
        ...dto,
        searchName: toSearchName(dto.name),
        isOfficial: dto.isOfficial ?? false,
        ownerId: dto.isOfficial ? null : user.id,
      },
    })
    return this.get(playlist.id, user)
  }

  async update(id: string, user: AuthUser, dto: UpdatePlaylistDto): Promise<PlaylistDetail> {
    await this.findWritable(id, user)
    await this.prisma.playlist.update({
      where: { id },
      data: { ...dto, ...(dto.name === undefined ? {} : { searchName: toSearchName(dto.name) }) },
    })
    return this.get(id, user)
  }

  async remove(id: string, user: AuthUser): Promise<void> {
    await this.findWritable(id, user)
    await this.prisma.playlist.delete({ where: { id } })
  }

  async addTrack(id: string, user: AuthUser, trackId: string): Promise<PlaylistDetail> {
    const playlist = await this.findWritable(id, user)
    const position = playlist.tracks.reduce((max, track) => Math.max(max, track.position + 1), 0)
    await this.prisma.playlistTrack.upsert({
      where: { playlistId_trackId: { playlistId: id, trackId } },
      create: { playlistId: id, trackId, position },
      update: {},
    })
    return this.get(id, user)
  }

  /**
   * Creates a playlist of the user with tracks already in it, all or nothing: a playlist is never
   * left half filled. 400 when a track does not exist.
   */
  async createWithTracks(
    user: AuthUser,
    dto: CreatePlaylistDto,
    trackIds: string[],
  ): Promise<PlaylistDetail> {
    if (dto.isOfficial) throw new ForbiddenException("Only the API can create official playlists")
    const ids = [...new Set(trackIds)]
    await this.assertTracksExist(ids)
    const playlist = await this.prisma.$transaction(async (tx) => {
      const created = await tx.playlist.create({
        data: { ...dto, searchName: toSearchName(dto.name), isOfficial: false, ownerId: user.id },
      })
      await tx.playlistTrack.createMany({
        data: ids.map((trackId, position) => ({ playlistId: created.id, trackId, position })),
      })
      return created
    })
    return this.get(playlist.id, user)
  }

  /**
   * Adds several tracks at the end of a playlist in one go (tracks already in it stay where they
   * are). 400 when a track does not exist. Returns how many were new.
   */
  async addTracks(id: string, user: AuthUser, trackIds: string[]): Promise<number> {
    const playlist = await this.findWritable(id, user)
    await this.assertTracksExist([...new Set(trackIds)])
    const present = new Set(playlist.tracks.map((track) => track.trackId))
    const fresh = [...new Set(trackIds)].filter((trackId) => !present.has(trackId))
    const start = playlist.tracks.reduce((max, track) => Math.max(max, track.position + 1), 0)
    await this.prisma.playlistTrack.createMany({
      data: fresh.map((trackId, index) => ({ playlistId: id, trackId, position: start + index })),
      skipDuplicates: true,
    })
    return fresh.length
  }

  async removeTrack(id: string, user: AuthUser, trackId: string): Promise<PlaylistDetail> {
    await this.findWritable(id, user)
    await this.prisma.playlistTrack.deleteMany({ where: { playlistId: id, trackId } })
    return this.get(id, user)
  }

  private async assertTracksExist(ids: string[]): Promise<void> {
    if (ids.length === 0) return
    const found = new Set((await this.tracks.getByIds(ids)).map((track) => track.id))
    if (ids.some((id) => !found.has(id))) {
      throw new BadRequestException("A track in the list does not exist")
    }
  }

  /** Official playlists are public; personal ones only for their owner (or an admin). */
  private async findReadable(id: string, user: AuthUser | null): Promise<PlaylistRow> {
    const row = await this.prisma.playlist.findUnique({ where: { id }, include })
    const allowed = row && (row.isOfficial || (!!user && this.isOwnerOrAdmin(row, user)))
    if (!row || !allowed) throw new NotFoundException("Playlist not found")
    return row
  }

  private async findWritable(id: string, user: AuthUser): Promise<PlaylistRow> {
    const row = await this.findReadable(id, user)
    const canWrite = row.isOfficial ? user.role === Role.ADMIN : this.isOwnerOrAdmin(row, user)
    if (!canWrite) throw new ForbiddenException("You cannot change this playlist")
    return row
  }

  private isOwnerOrAdmin(row: Playlist, user: AuthUser): boolean {
    return row.ownerId === user.id || user.role === Role.ADMIN
  }

  private async toViews(rows: PlaylistRow[], userId?: string): Promise<PlaylistView[]> {
    const ids = rows.map((row) => row.id)
    const ownerIds = rows.flatMap((row) => (row.ownerId ? [row.ownerId] : []))
    const [owners, counts, liked] = await Promise.all([
      this.users.getPublicProfiles(ownerIds),
      this.likes.counts(LikeKind.Playlists, ids),
      this.likes.likedSet(LikeKind.Playlists, userId, ids),
    ])
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      owner: row.isOfficial
        ? OFFICIAL_OWNER_NAME
        : (owners.get(row.ownerId ?? "")?.name ?? "Unknown"),
      ownerId: row.ownerId,
      isOfficial: row.isOfficial,
      description: row.description,
      cover: row.coverUrl,
      trackIds: row.tracks.map((track) => track.trackId),
      likesCount: counts.get(row.id) ?? 0,
      liked: liked.has(row.id),
    }))
  }
}
