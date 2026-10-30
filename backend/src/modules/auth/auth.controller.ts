import { Body, Controller, Get, HttpCode, Post, UseGuards } from "@nestjs/common"
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger"
import { ThrottlerGuard } from "@nestjs/throttler"
import { Auth, CurrentUser, type AuthUser } from "../../shared/index.js"
import { UsersService, type UserView } from "../users/index.js"
import { AuthResult, AuthService, TokenPair } from "./auth.service.js"
import { AuthResponseDto, AuthUserDto, TokenPairDto } from "./dto/auth-response.dto.js"
import { LoginDto, RefreshTokenDto, RegisterDto } from "./dto/auth.dto.js"

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
  ) {}

  // register, login and refresh are rate limited per IP (see AuthModule); the others are not.

  @Post("register")
  @UseGuards(ThrottlerGuard)
  @ApiOperation({ summary: "Create an account and get an access + refresh token" })
  @ApiCreatedResponse({ type: AuthResponseDto })
  @ApiTooManyRequestsResponse({ description: "Too many attempts from this IP" })
  register(@Body() dto: RegisterDto): Promise<AuthResult> {
    return this.auth.register(dto)
  }

  @Post("login")
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  @ApiOperation({ summary: "Log in and get an access + refresh token" })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: "Wrong email or password" })
  @ApiTooManyRequestsResponse({ description: "Too many attempts from this IP" })
  login(@Body() dto: LoginDto): Promise<AuthResult> {
    return this.auth.login(dto)
  }

  @Post("refresh")
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  @ApiOperation({
    summary: "Exchange a refresh token for a new access + refresh token (rotation)",
    description:
      "The refresh token you send is revoked. Sending an already-revoked token is treated as " +
      "theft: every token of that login is revoked and the call fails with 401.",
  })
  @ApiOkResponse({ type: TokenPairDto })
  @ApiUnauthorizedResponse({ description: "Unknown, expired, revoked or reused refresh token" })
  @ApiTooManyRequestsResponse({ description: "Too many attempts from this IP" })
  refresh(@Body() dto: RefreshTokenDto): Promise<TokenPair> {
    return this.auth.refresh(dto.refreshToken)
  }

  @Post("logout")
  @HttpCode(204)
  @ApiOperation({
    summary: "Revoke a refresh token (log out)",
    description: "Idempotent: unknown or already revoked tokens also return 204.",
  })
  @ApiNoContentResponse({ description: "The token is no longer usable" })
  logout(@Body() dto: RefreshTokenDto): Promise<void> {
    return this.auth.logout(dto.refreshToken)
  }

  @Get("me")
  @Auth()
  @ApiOperation({ summary: "Who am I (validates the access token)" })
  @ApiOkResponse({ type: AuthUserDto })
  me(@CurrentUser() user: AuthUser | null): Promise<UserView> {
    return this.users.getView(user!.id)
  }
}
