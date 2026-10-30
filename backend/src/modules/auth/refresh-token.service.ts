import { Injectable, UnauthorizedException } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { createHash, randomBytes, randomUUID } from "node:crypto"
import type { Prisma } from "../../generated/prisma/client.js"
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
 */
@Injectable()
export class RefreshTokenService {
  private readonly ttlMs: number

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.ttlMs = readAuthConfig(config).refreshTtlMs
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

    if (stored.revokedAt) {
      // Reuse of a revoked token: assume it was stolen and kill every token of this login.
      await this.revokeFamily(this.prisma, stored.familyId)
      throw this.invalid()
    }
    if (stored.expiresAt <= new Date()) throw this.invalid()

    const rotated = await this.prisma.$transaction(async (tx) => {
      // Claim the token atomically so two concurrent refreshes cannot both succeed.
      const claimed = await tx.refreshToken.updateMany({
        where: { id: stored.id, revokedAt: null },
        data: { revokedAt: new Date() },
      })
      if (claimed.count === 0) {
        await this.revokeFamily(tx, stored.familyId)
        return null
      }
      const refreshToken = await this.create(tx, stored.userId, stored.familyId)
      return { userId: stored.userId, refreshToken }
    })
    // Throw after the transaction: throwing inside it would roll the family revocation back.
    if (!rotated) throw this.invalid()
    return rotated
  }

  /** Revokes one token. Unknown or already revoked tokens are ignored (idempotent). */
  async revoke(rawToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hashRefreshToken(rawToken), revokedAt: null },
      data: { revokedAt: new Date() },
    })
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
