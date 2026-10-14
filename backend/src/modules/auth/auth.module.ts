import { Module } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { JwtModule } from "@nestjs/jwt"
import { PassportModule } from "@nestjs/passport"
import { UsersModule } from "../users/index.js"
import { AuthController } from "./auth.controller.js"
import { AuthService } from "./auth.service.js"
import { JwtStrategy } from "./jwt.strategy.js"

const DEFAULT_EXPIRES_IN = "7d"

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>("JWT_SECRET"),
        signOptions: {
          expiresIn: (config.get<string>("JWT_EXPIRES_IN") ?? DEFAULT_EXPIRES_IN) as never,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
