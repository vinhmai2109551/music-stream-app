import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import { compare, hash } from "bcryptjs"
import { UsersService, type UserView } from "../users/index.js"
import { LoginDto, RegisterDto } from "./dto/auth.dto.js"

const BCRYPT_ROUNDS = 10

export interface AuthResult {
  accessToken: string
  user: UserView
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const existing = await this.users.findCredentials(dto.email)
    if (existing) throw new ConflictException("Email is already registered")
    const passwordHash = await hash(dto.password, BCRYPT_ROUNDS)
    const user = await this.users.create({ email: dto.email, name: dto.name, passwordHash })
    return this.issueToken(user)
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const credentials = await this.users.findCredentials(dto.email)
    const valid = credentials ? await compare(dto.password, credentials.passwordHash) : false
    if (!credentials || !valid) throw new UnauthorizedException("Invalid email or password")
    const { passwordHash: _passwordHash, ...user } = credentials
    return this.issueToken(user)
  }

  private async issueToken(user: UserView): Promise<AuthResult> {
    const accessToken = await this.jwt.signAsync({ sub: user.id, role: user.role })
    return { accessToken, user }
  }
}
