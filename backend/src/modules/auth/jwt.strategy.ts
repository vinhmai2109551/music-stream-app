import { Injectable } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { PassportStrategy } from "@nestjs/passport"
import { ExtractJwt, Strategy } from "passport-jwt"
import type { Role } from "../../generated/prisma/enums.js"
import type { AuthUser } from "../../shared/index.js"

interface JwtPayload {
  sub: string
  role: Role
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>("JWT_SECRET"),
    })
  }

  /** The token is trusted as-is (stateless): id and role come straight from the payload. */
  validate(payload: JwtPayload): AuthUser {
    return { id: payload.sub, role: payload.role }
  }
}
