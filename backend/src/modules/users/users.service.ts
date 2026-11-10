import { Injectable, NotFoundException } from "@nestjs/common"
import { Prisma } from "../../generated/prisma/client.js"
import { PrismaService } from "../../infrastructure/prisma/prisma.service.js"
import type { Role } from "../../generated/prisma/enums.js"
import { pageArgs, toPage, type DailyCount, type Page } from "../../shared/index.js"
import { dailyCountsQuery } from "../../shared/stats/daily-counts.js"
import { UploadsService, type AvatarUploadRequest, type PresignedUpload } from "../uploads/index.js"
import { UpdateProfileDto } from "./dto/update-profile.dto.js"

export interface UserView {
  id: string
  email: string
  name: string
  avatarUrl: string | null
  role: Role
  isPremium: boolean
}

/** What the admin web sees of a user (never the password hash). */
export interface AdminUserView extends UserView {
  isBanned: boolean
  createdAt: Date
}

/** What decides whether a request of a user is let in. */
export interface AccessState {
  role: Role
  isBanned: boolean
}

export interface AdminUserFilter {
  page: number
  limit: number
  /** Part of the email or the name. */
  q?: string
  role?: Role
  banned?: boolean
}

export interface AccessChange {
  role?: Role
  isBanned?: boolean
}

/** What other people may see about a user (comments, playlist owners). */
export interface PublicUser {
  id: string
  name: string
  avatarUrl: string | null
}

export interface CreateUserInput {
  email: string
  name: string
  passwordHash: string
  role?: Role
  avatarUrl?: string
}

const viewSelect = {
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
  role: true,
  isPremium: true,
} as const

const adminSelect = { ...viewSelect, isBanned: true, createdAt: true } as const

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploads: UploadsService,
  ) {}

  create(input: CreateUserInput): Promise<UserView> {
    return this.prisma.user.create({
      data: { ...input, email: input.email.toLowerCase() },
      select: viewSelect,
    })
  }

  /** Used only by the auth module to verify credentials. */
  findCredentials(
    email: string,
  ): Promise<(UserView & { passwordHash: string; isBanned: boolean }) | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { ...viewSelect, passwordHash: true, isBanned: true },
    })
  }

  /** Current role and ban of a user, or null when the user no longer exists. */
  getAccessState(id: string): Promise<AccessState | null> {
    return this.prisma.user.findUnique({ where: { id }, select: { role: true, isBanned: true } })
  }

  async getView(id: string): Promise<UserView> {
    const user = await this.prisma.user.findUnique({ where: { id }, select: viewSelect })
    if (!user) throw new NotFoundException("User not found")
    return user
  }

  async getPublicProfiles(ids: string[]): Promise<Map<string, PublicUser>> {
    const users = await this.prisma.user.findMany({
      where: { id: { in: [...new Set(ids)] } },
      select: { id: true, name: true, avatarUrl: true },
    })
    return new Map(users.map((user) => [user.id, user]))
  }

  presignAvatar(id: string, request: AvatarUploadRequest): Promise<PresignedUpload> {
    return this.uploads.presignAvatar(id, request)
  }

  async updateProfile(id: string, dto: UpdateProfileDto): Promise<UserView> {
    this.uploads.assertAvatarOf(id, dto.avatarUrl)

    // Only a new picture makes the old one garbage.
    const before =
      dto.avatarUrl === undefined
        ? null
        : await this.prisma.user.findUnique({ where: { id }, select: { avatarUrl: true } })
    const updated = await this.prisma.user.update({ where: { id }, data: dto, select: viewSelect })

    const previous = before?.avatarUrl ?? null
    // Fire and forget: the request has succeeded whether or not the old file could be deleted.
    if (previous && previous !== updated.avatarUrl) void this.uploads.deleteAvatar(id, previous)
    return updated
  }

  subscribe(id: string): Promise<UserView> {
    return this.prisma.user.update({
      where: { id },
      data: { isPremium: true },
      select: viewSelect,
    })
  }

  // ---- for the admin module: the rules (who may change whom) live there, the data here

  async listForAdmin(filter: AdminUserFilter): Promise<Page<AdminUserView>> {
    const where = {
      ...(filter.q
        ? {
            OR: [
              { email: { contains: filter.q, mode: "insensitive" as const } },
              { name: { contains: filter.q, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(filter.role ? { role: filter.role } : {}),
      ...(filter.banned === undefined ? {} : { isBanned: filter.banned }),
    }
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: adminSelect,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        ...pageArgs(filter.page, filter.limit),
      }),
      this.prisma.user.count({ where }),
    ])
    return toPage(items, total, filter.page, filter.limit)
  }

  /** Changes the role and/or the ban of a user; 404 when there is no such user. */
  async changeAccess(id: string, change: AccessChange): Promise<AdminUserView> {
    const data = {
      ...(change.role === undefined ? {} : { role: change.role }),
      ...(change.isBanned === undefined ? {} : { isBanned: change.isBanned }),
    }
    try {
      return await this.prisma.user.update({ where: { id }, data, select: adminSelect })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new NotFoundException("User not found")
      }
      throw error
    }
  }

  /** Deletes the user and, through the database, everything that belongs to them. */
  async remove(id: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id }, select: { avatarUrl: true } })
    if (!user) throw new NotFoundException("User not found")
    await this.prisma.user.delete({ where: { id } })
    // Fire and forget: the account is gone whether or not the picture could be deleted.
    if (user.avatarUrl) void this.uploads.deleteAvatar(id, user.avatarUrl)
  }

  count(): Promise<number> {
    return this.prisma.user.count()
  }

  /** Accounts made per day over the last `days` days (today included), by the day of `timeZone`; days without any are left out. */
  newByDay(days: number, timeZone: string): Promise<DailyCount[]> {
    return this.prisma.$queryRaw<DailyCount[]>(dailyCountsQuery("User", days, timeZone))
  }
}
