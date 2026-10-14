import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common"
import type { Comment } from "../../generated/prisma/client.js"
import { Role } from "../../generated/prisma/enums.js"
import { PrismaService } from "../../infrastructure/prisma/prisma.service.js"
import type { AuthUser } from "../../shared/index.js"
import { UsersService, type PublicUser } from "../users/index.js"
import { CreateCommentDto, ListCommentsQueryDto } from "./dto/comment.dto.js"

const MAX_COMMENTS = 200

export interface CommentView {
  id: string
  user: PublicUser | null
  text: string
  createdAt: Date
  likesCount: number
  liked: boolean
  parentId: string | null
  trackId: string | null
  postId: string | null
}

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
  ) {}

  /** Oldest first, so replies appear after the comment they answer. */
  async list(query: ListCommentsQueryDto, userId?: string): Promise<CommentView[]> {
    this.assertSingleTarget(query)
    const rows = await this.prisma.comment.findMany({
      where: { trackId: query.trackId ?? null, postId: query.postId ?? null },
      orderBy: { createdAt: "asc" },
      take: MAX_COMMENTS,
    })
    return this.toViews(rows, userId)
  }

  async create(userId: string, dto: CreateCommentDto): Promise<CommentView> {
    this.assertSingleTarget(dto)
    if (dto.parentId) {
      const parent = await this.prisma.comment.findUnique({ where: { id: dto.parentId } })
      const sameTarget =
        parent && parent.trackId === (dto.trackId ?? null) && parent.postId === (dto.postId ?? null)
      if (!sameTarget) throw new BadRequestException("The comment you reply to is not on this item")
    }
    const row = await this.prisma.comment.create({
      data: {
        text: dto.text,
        userId,
        trackId: dto.trackId,
        postId: dto.postId,
        parentId: dto.parentId,
      },
    })
    return (await this.toViews([row], userId))[0]
  }

  async remove(id: string, user: AuthUser): Promise<void> {
    const comment = await this.prisma.comment.findUnique({ where: { id } })
    if (!comment) throw new NotFoundException("Comment not found")
    if (comment.userId !== user.id && user.role !== Role.ADMIN) {
      throw new ForbiddenException("You can only delete your own comments")
    }
    await this.prisma.comment.delete({ where: { id } })
  }

  async like(userId: string, commentId: string): Promise<void> {
    await this.prisma.commentLike.upsert({
      where: { userId_commentId: { userId, commentId } },
      create: { userId, commentId },
      update: {},
    })
  }

  async unlike(userId: string, commentId: string): Promise<void> {
    await this.prisma.commentLike.deleteMany({ where: { userId, commentId } })
  }

  /** For other modules: number of comments per feed post (postId -> count). */
  async countByPost(postIds: string[]): Promise<Map<string, number>> {
    if (postIds.length === 0) return new Map()
    const rows = await this.prisma.comment.groupBy({
      by: ["postId"],
      where: { postId: { in: postIds } },
      _count: { _all: true },
    })
    return new Map(
      rows.flatMap((row) => (row.postId ? [[row.postId, row._count._all] as const] : [])),
    )
  }

  private assertSingleTarget(target: { trackId?: string; postId?: string }): void {
    if (!target.trackId === !target.postId) {
      throw new BadRequestException("Provide exactly one of trackId or postId")
    }
  }

  private async toViews(rows: Comment[], userId?: string): Promise<CommentView[]> {
    const ids = rows.map((row) => row.id)
    const [authors, likeRows, mine] = await Promise.all([
      this.users.getPublicProfiles(rows.map((row) => row.userId)),
      this.prisma.commentLike.groupBy({
        by: ["commentId"],
        where: { commentId: { in: ids } },
        _count: { _all: true },
      }),
      userId
        ? this.prisma.commentLike.findMany({ where: { userId, commentId: { in: ids } } })
        : Promise.resolve([]),
    ])
    const counts = new Map(likeRows.map((row) => [row.commentId, row._count._all]))
    const liked = new Set(mine.map((row) => row.commentId))
    return rows.map((row) => ({
      id: row.id,
      user: authors.get(row.userId) ?? null,
      text: row.text,
      createdAt: row.createdAt,
      likesCount: counts.get(row.id) ?? 0,
      liked: liked.has(row.id),
      parentId: row.parentId,
      trackId: row.trackId,
      postId: row.postId,
    }))
  }
}
