import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import { compare, hash, hashSync } from "bcryptjs"
import { randomUUID } from "node:crypto"
import { UsersService, type UserView } from "../users/index.js"
import { LoginDto, RegisterDto } from "./dto/auth.dto.js"
import { RefreshTokenService } from "./refresh-token.service.js"

const BCRYPT_ROUNDS = 10

/**
 * Compared against when the email has no account, so that answering takes as long as it does for a
 * real account with a wrong password. Without it the time of the answer tells a stranger which
 * emails are registered. Made once, with the same cost as the real hashes.
 */
const UNKNOWN_USER_HASH = hashSync(randomUUID(), BCRYPT_ROUNDS)

/** Said to a banned user who tries to log in or to refresh a token. */
export const ACCOUNT_BANNED_MESSAGE = "This account has been banned. Contact the administrator."

export interface TokenPair {
  accessToken: string
  refreshToken: string
}

export interface AuthResult extends TokenPair {
  user: UserView
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly refreshTokens: RefreshTokenService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const existing = await this.users.findCredentials(dto.email)
    if (existing) throw new ConflictException("Email is already registered")
    const passwordHash = await hash(dto.password, BCRYPT_ROUNDS)
    const user = await this.users.create({ email: dto.email, name: dto.name, passwordHash })
    return this.startSession(user)
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const credentials = await this.users.findCredentials(dto.email)
    const valid = await compare(dto.password, credentials?.passwordHash ?? UNKNOWN_USER_HASH)
    if (!credentials || !valid) throw new UnauthorizedException("Invalid email or password")
    // Only after the password is right, so the answer does not tell a stranger who is banned.
    if (credentials.isBanned) throw new ForbiddenException(ACCOUNT_BANNED_MESSAGE)
    const { passwordHash: _passwordHash, isBanned: _isBanned, ...user } = credentials
    return this.startSession(user)
  }

  /** Rotates the refresh token and returns a fresh pair. */
  async refresh(rawRefreshToken: string): Promise<TokenPair> {
    // A ban revokes every token of the user, and a revoked token would answer 401: look at the
    // owner first, so a banned user is told why.
    const ownerId = await this.refreshTokens.ownerOf(rawRefreshToken)
    if (ownerId && (await this.users.getAccessState(ownerId))?.isBanned) {
      throw new ForbiddenException(ACCOUNT_BANNED_MESSAGE)
    }
    const { userId, refreshToken } = await this.refreshTokens.rotate(rawRefreshToken)
    // A ban can land between the check above and the rotation (the ban revokes the tokens that
    // exist at that moment, not the one just made): look again, and take the new token back.
    if ((await this.users.getAccessState(userId))?.isBanned) {
      await this.refreshTokens.revokeAllOf(userId)
      throw new ForbiddenException(ACCOUNT_BANNED_MESSAGE)
    }
    const user = await this.users.getView(userId)
    return { accessToken: await this.signAccessToken(user), refreshToken }
  }

  logout(rawRefreshToken: string): Promise<void> {
    return this.refreshTokens.revoke(rawRefreshToken)
  }

  /** For the admin module: ends every login of a user (their refresh tokens stop working). */
  revokeAllSessions(userId: string): Promise<void> {
    return this.refreshTokens.revokeAllOf(userId)
  }

  private async startSession(user: UserView): Promise<AuthResult> {
    const [accessToken, refreshToken] = await Promise.all([
      this.signAccessToken(user),
      this.refreshTokens.issue(user.id),
    ])
    return { accessToken, refreshToken, user }
  }

  private signAccessToken(user: UserView): Promise<string> {
    return this.jwt.signAsync({ sub: user.id, role: user.role })
  }
}
