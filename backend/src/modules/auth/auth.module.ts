import { Module } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { JwtModule } from "@nestjs/jwt"
import { PassportModule } from "@nestjs/passport"
import { ThrottlerModule } from "@nestjs/throttler"
import { UsersModule } from "../users/index.js"
import { readAuthConfig } from "./auth.config.js"
import { AuthController } from "./auth.controller.js"
import { AuthService } from "./auth.service.js"
import { JwtStrategy } from "./jwt.strategy.js"
import { RefreshTokenService } from "./refresh-token.service.js"

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>("JWT_SECRET"),
        signOptions: { expiresIn: readAuthConfig(config).accessExpiresIn as never },
      }),
    }),
    // Only routes that use ThrottlerGuard are limited (login, register, refresh).
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const { throttleLimit, throttleTtlMs } = readAuthConfig(config)
        return { throttlers: [{ name: "default", limit: throttleLimit, ttl: throttleTtlMs }] }
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, RefreshTokenService, JwtStrategy],
})
export class AuthModule {}
