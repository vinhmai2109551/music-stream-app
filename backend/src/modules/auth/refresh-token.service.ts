import { Injectable, UnauthorizedException } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { createHash, randomBytes, randomUUID } from "node:crypto"
import type { Prisma, RefreshToken } from "../../generated/prisma/client.js"
import { PrismaService } from "../../infrastructure/prisma/prisma.service.js"
import { readAuthConfig } from "./auth.config.js"

const TOKEN_BYTES = 64

/** Only this hash is stored; the raw token exists in the database never. */
export function hashRefreshToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex")
}

export interface RotatedToken {
  userId: string
  refreshToken: string
}

/**
 * Refresh tokens are opaque random strings (not JWTs). Every login starts a "family"; each
 * refresh revokes the used token and issues a new one in the same family. Presenting a token that
 * was already revoked means it leaked (or was replayed), so the whole family is revoked.
 *
 * One exception, the grace period: the server may have rotated the token while the app was killed
 * (or lost the connection) before it could save the answer, so the app comes back with the
 * token it still has. If that token was replaced only moments ago it is not treated as stolen:
 * the caller gets another new token of the same family instead. Both new tokens stay valid; once
 * the grace period is over, presenting the old token revokes the family as before.
 */
@Injectable()
export class RefreshTokenService {
  private readonly ttlMs: number
  private readonly reuseGraceMs: number

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    const { refreshTtlMs, refreshReuseGraceMs } = readAuthConfig(config)
    this.ttlMs = refreshTtlMs
    this.reuseGraceMs = refreshReuseGraceMs
  }

  /** Starts a new family (a new login) and returns its first raw token. */
  issue(userId: string): Promise<string> {
    return this.create(this.prisma, userId, randomUUID())
  }

  /** Exchanges a valid token for a new one in the same family. Throws 401 otherwise. */
  async rotate(rawToken: string): Promise<RotatedToken> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashRefreshToken(rawToken) },
    })
    if (!stored) throw this.invalid()
    if (stored.revokedAt) return this.reuse(stored)
    if (stored.expiresAt <= new Date()) throw this.invalid()

    const rotated = await this.prisma.$transaction(async (tx) => {
      // Claim the token atomically so two concurrent refreshes cannot both rotate it.
      const now = new Date()
      const claimed = await tx.refreshToken.updateMany({
        where: { id: stored.id, revokedAt: null },
        data: { revokedAt: now, replacedAt: now },
      })
      if (claimed.count === 0) return null
      const refreshToken = await this.create(tx, stored.userId, stored.familyId)
      return { userId: stored.userId, refreshToken }
    })
    if (rotated) return rotated

    // A parallel request with the same token won the claim: from here on this is a reuse.
    const current = await this.prisma.refreshToken.findUnique({ where: { id: stored.id } })
    return this.reuse(current ?? stored)
  }

  /** Revokes one token. Unknown or already revoked tokens are ignored (idempotent). */
  async revoke(rawToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hashRefreshToken(rawToken), revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }

  /**
   * A revoked token was presented. Inside the grace period (and while its family is still alive)
   * it gets a new token of the same family; otherwise it is theft: the whole family is revoked.
   */
  private async reuse(stored: RefreshToken): Promise<RotatedToken> {
    if (await this.canReplay(stored)) {
      const refreshToken = await this.create(this.prisma, stored.userId, stored.familyId)
      return { userId: stored.userId, refreshToken }
    }
    // Reuse of a revoked token: assume it was stolen and kill every token of this login.
    await this.revokeFamily(this.prisma, stored.familyId)
    throw this.invalid()
  }

  /**
   * Only a token that a refresh replaced (not one revoked by logout or by a theft alarm) can be
   * replayed, only within the grace period, and only while the login still has a live token.
   */
  private async canReplay(stored: RefreshToken): Promise<boolean> {
    const { replacedAt } = stored
    if (!replacedAt || this.reuseGraceMs <= 0) return false
    const now = new Date()
    if (now.getTime() - replacedAt.getTime() > this.reuseGraceMs || stored.expiresAt <= now) {
      return false
    }
    const alive = await this.prisma.refreshToken.findFirst({
      where: { familyId: stored.familyId, revokedAt: null, expiresAt: { gt: now } },
      select: { id: true },
    })
    return alive !== null
  }

  private async create(
    db: Pick<Prisma.TransactionClient, "refreshToken">,
    userId: string,
    familyId: string,
  ): Promise<string> {
    const rawToken = randomBytes(TOKEN_BYTES).toString("base64url")
    await db.refreshToken.create({
      data: {
        userId,
        familyId,
        tokenHash: hashRefreshToken(rawToken),
        expiresAt: new Date(Date.now() + this.ttlMs),
      },
    })
    return rawToken
  }

  private async revokeFamily(
    db: Pick<Prisma.TransactionClient, "refreshToken">,
    familyId: string,
  ): Promise<void> {
    await db.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }

  private invalid(): UnauthorizedException {
    return new UnauthorizedException("Invalid or expired refresh token")
  }
}
