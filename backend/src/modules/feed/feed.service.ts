import { Injectable, NotFoundException } from "@nestjs/common"
import type { FeedPost } from "../../generated/prisma/client.js"
import { PrismaService } from "../../infrastructure/prisma/prisma.service.js"
import { pageArgs, toPage, type Page, type PaginationQueryDto } from "../../shared/index.js"
import { ArtistsService, type ArtistSummary } from "../artists/index.js"
import { CommentsService } from "../comments/index.js"
import { TracksService, type TrackView } from "../tracks/index.js"
import { CreateFeedPostDto } from "./dto/feed.dto.js"

export interface FeedPostView {
  id: string
  artist: ArtistSummary | null
  track: TrackView | null
  artwork: string
  caption: string
  createdAt: Date
  likesCount: number
  commentsCount: number
  liked: boolean
}

@Injectable()
export class FeedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly artists: ArtistsService,
    private readonly tracks: TracksService,
    private readonly comments: CommentsService,
  ) {}

  /** Newest posts first. */
  async list(query: PaginationQueryDto, userId?: string): Promise<Page<FeedPostView>> {
    const [rows, total] = await Promise.all([
      this.prisma.feedPost.findMany({
        orderBy: { createdAt: "desc" },
        ...pageArgs(query.page, query.limit),
      }),
      this.prisma.feedPost.count(),
    ])
    return toPage(await this.toViews(rows, userId), total, query.page, query.limit)
  }

  async get(id: string, userId?: string): Promise<FeedPostView> {
    const row = await this.prisma.feedPost.findUnique({ where: { id } })
    if (!row) throw new NotFoundException("Post not found")
    return (await this.toViews([row], userId))[0]
  }

  async create(dto: CreateFeedPostDto): Promise<FeedPostView> {
    const post = await this.prisma.feedPost.create({ data: dto })
    return this.get(post.id)
  }

  async remove(id: string): Promise<void> {
    await this.prisma.feedPost.delete({ where: { id } })
  }

  async like(userId: string, postId: string): Promise<void> {
    await this.prisma.feedPostLike.upsert({
      where: { userId_postId: { userId, postId } },
      create: { userId, postId },
      update: {},
    })
  }

  async unlike(userId: string, postId: string): Promise<void> {
    await this.prisma.feedPostLike.deleteMany({ where: { userId, postId } })
  }

  private async toViews(rows: FeedPost[], userId?: string): Promise<FeedPostView[]> {
    const ids = rows.map((row) => row.id)
    const [artists, tracks, commentCounts, likeRows, mine] = await Promise.all([
      this.artists.getSummaries(rows.map((row) => row.artistId)),
      this.tracks.getByIds(
        rows.map((row) => row.trackId),
        userId,
      ),
      this.comments.countByPost(ids),
      this.prisma.feedPostLike.groupBy({
        by: ["postId"],
        where: { postId: { in: ids } },
        _count: { _all: true },
      }),
      userId
        ? this.prisma.feedPostLike.findMany({ where: { userId, postId: { in: ids } } })
        : Promise.resolve([]),
    ])
    const trackById = new Map(tracks.map((track) => [track.id, track]))
    const likeCounts = new Map(likeRows.map((row) => [row.postId, row._count._all]))
    const liked = new Set(mine.map((row) => row.postId))
    return rows.map((row) => ({
      id: row.id,
      artist: artists.get(row.artistId) ?? null,
      track: trackById.get(row.trackId) ?? null,
      artwork: row.artworkUrl,
      caption: row.caption,
      createdAt: row.createdAt,
      likesCount: likeCounts.get(row.id) ?? 0,
      commentsCount: commentCounts.get(row.id) ?? 0,
      liked: liked.has(row.id),
    }))
  }
}
