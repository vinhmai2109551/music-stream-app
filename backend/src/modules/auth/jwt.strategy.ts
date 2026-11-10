import { Injectable, UnauthorizedException } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { PassportStrategy } from "@nestjs/passport"
import { ExtractJwt, Strategy } from "passport-jwt"
import type { Role } from "../../generated/prisma/enums.js"
import type { AuthUser } from "../../shared/index.js"
import { UsersService } from "../users/index.js"

interface JwtPayload {
  sub: string
  role: Role
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly users: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>("JWT_SECRET"),
    })
  }

  /**
   * The signature proves the token is ours, not that the account is still allowed in: one read by
   * primary key per request makes a ban, a deletion or a change of role count at once instead of
   * when the token expires. The role comes from the database, not from the token.
   */
  async validate(payload: JwtPayload): Promise<AuthUser> {
    const state = await this.users.getAccessState(payload.sub)
    if (!state || state.isBanned) throw new UnauthorizedException("Account is not allowed")
    return { id: payload.sub, role: state.role }
  }
}
