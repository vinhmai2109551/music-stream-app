import { Injectable, NotFoundException } from "@nestjs/common"
import { PrismaService } from "../../infrastructure/prisma/prisma.service.js"
import type { Role } from "../../generated/prisma/enums.js"
import { UpdateProfileDto } from "./dto/update-profile.dto.js"

export interface UserView {
  id: string
  email: string
  name: string
  avatarUrl: string | null
  role: Role
  isPremium: boolean
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

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateUserInput): Promise<UserView> {
    return this.prisma.user.create({
      data: { ...input, email: input.email.toLowerCase() },
      select: viewSelect,
    })
  }

  /** Used only by the auth module to verify credentials. */
  findCredentials(email: string): Promise<(UserView & { passwordHash: string }) | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { ...viewSelect, passwordHash: true },
    })
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

  updateProfile(id: string, dto: UpdateProfileDto): Promise<UserView> {
    return this.prisma.user.update({ where: { id }, data: dto, select: viewSelect })
  }

  subscribe(id: string): Promise<UserView> {
    return this.prisma.user.update({
      where: { id },
      data: { isPremium: true },
      select: viewSelect,
    })
  }
}
