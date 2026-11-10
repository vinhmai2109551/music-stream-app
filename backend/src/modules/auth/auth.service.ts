import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import { compare, hash } from "bcryptjs"
import { UsersService, type UserView } from "../users/index.js"
import { LoginDto, RegisterDto } from "./dto/auth.dto.js"
import { RefreshTokenService } from "./refresh-token.service.js"

const BCRYPT_ROUNDS = 10

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
    const valid = credentials ? await compare(dto.password, credentials.passwordHash) : false
    if (!credentials || !valid) throw new UnauthorizedException("Invalid email or password")
    const { passwordHash: _passwordHash, ...user } = credentials
    return this.startSession(user)
  }

  /** Rotates the refresh token and returns a fresh pair. */
  async refresh(rawRefreshToken: string): Promise<TokenPair> {
    const { userId, refreshToken } = await this.refreshTokens.rotate(rawRefreshToken)
    const user = await this.users.getView(userId)
    return { accessToken: await this.signAccessToken(user), refreshToken }
  }

  logout(rawRefreshToken: string): Promise<void> {
    return this.refreshTokens.revoke(rawRefreshToken)
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
