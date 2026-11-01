import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common"
import type { Comment, Prisma } from "../../generated/prisma/client.js"
import { Role } from "../../generated/prisma/enums.js"
import { PrismaService } from "../../infrastructure/prisma/prisma.service.js"
import {
  toCursorPage,
  type AuthUser,
  type CursorPage,
  type CursorQueryDto,
} from "../../shared/index.js"
import { UsersService, type PublicUser } from "../users/index.js"
import { CreateCommentDto, ListCommentsQueryDto } from "./dto/comment.dto.js"

/** Replies shown under a top-level comment before the reader asks for more. */
const REPLY_PREVIEW = 3
const NEWEST_FIRST = [{ createdAt: "desc" as const }, { id: "desc" as const }]

/** A comment or a reply. `parentId` is the top-level comment a reply belongs to. */
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

/** One page of top-level comments. */
export interface CommentPage extends CursorPage<CommentThreadView> {
  /** Every comment on the track or post, replies included (not only this page). */
  total: number
}

/** A top-level comment with its newest replies. */
export interface CommentThreadView extends CommentView {
  /** Up to REPLY_PREVIEW newest replies, oldest first (the order to read them in). */
  replies: CommentView[]
  repliesCount: number
}

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
  ) {}

  /**
   * Top-level comments of a track or post, newest first, a page at a time. Each comes with its
   * REPLY_PREVIEW newest replies and the number of replies in all; `total` counts every comment.
   */
  async list(query: ListCommentsQueryDto, userId?: string): Promise<CommentPage> {
    this.assertSingleTarget(query)
    const target = { trackId: query.trackId ?? null, postId: query.postId ?? null }
    const [rows, total] = await Promise.all([
      this.prisma.comment.findMany({
        where: { ...target, parentId: null, ...(await this.startAfter(query.cursor)) },
        orderBy: NEWEST_FIRST,
        take: query.limit + 1,
        include: {
          replies: { orderBy: NEWEST_FIRST, take: REPLY_PREVIEW },
          _count: { select: { replies: true } },
        },
      }),
      this.prisma.comment.count({ where: target }),
    ])
    const page = toCursorPage(rows, query.limit)

    const views = await this.toViews(
      [...page.items, ...page.items.flatMap((root) => root.replies)],
      userId,
    )
    const byId = new Map(views.map((view) => [view.id, view]))
    const viewOf = (row: Comment): CommentView => {
      const view = byId.get(row.id)
      if (!view) throw new Error(`Comment ${row.id} was not turned into a view`)
      return view
    }
    const items = page.items.map((root) => ({
      ...viewOf(root),
      replies: [...root.replies].reverse().map(viewOf),
      repliesCount: root._count.replies,
    }))
    return { items, nextCursor: page.nextCursor, total }
  }

  /**
   * The replies of one comment, newest first, a page at a time. To load the ones before those
   * already on screen, pass the id of the oldest reply you have as `cursor`.
   */
  async listReplies(
    commentId: string,
    query: CursorQueryDto,
    userId?: string,
  ): Promise<CursorPage<CommentView>> {
    const parent = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true },
    })
    if (!parent) throw new NotFoundException("Comment not found")

    const rows = await this.prisma.comment.findMany({
      where: { parentId: commentId, ...(await this.startAfter(query.cursor)) },
      orderBy: NEWEST_FIRST,
      take: query.limit + 1,
    })
    const page = toCursorPage(rows, query.limit)
    return { items: await this.toViews(page.items, userId), nextCursor: page.nextCursor }
  }

  async create(userId: string, dto: CreateCommentDto): Promise<CommentView> {
    this.assertSingleTarget(dto)
    let parentId: string | undefined
    if (dto.parentId) {
      const parent = await this.prisma.comment.findUnique({ where: { id: dto.parentId } })
      const sameTarget =
        parent && parent.trackId === (dto.trackId ?? null) && parent.postId === (dto.postId ?? null)
      if (!parent || !sameTarget) {
        throw new BadRequestException("The comment you reply to is not on this item")
      }
      // Threads are one level deep: answering a reply continues the thread of its top-level comment.
      parentId = parent.parentId ?? parent.id
    }
    const row = await this.prisma.comment.create({
      data: { text: dto.text, userId, trackId: dto.trackId, postId: dto.postId, parentId },
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

  /** Keeps only the comments older than the one `cursor` names (newest-first order). */
  private async startAfter(cursor: string | undefined): Promise<Prisma.CommentWhereInput> {
    if (!cursor) return {}
    const anchor = await this.prisma.comment.findUnique({
      where: { id: cursor },
      select: { id: true, createdAt: true },
    })
    if (!anchor) throw new BadRequestException("Invalid cursor")
    return {
      OR: [
        { createdAt: { lt: anchor.createdAt } },
        { createdAt: anchor.createdAt, id: { lt: anchor.id } },
      ],
    }
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
