import { Body, Controller, Get, HttpCode, Post } from "@nestjs/common"
import { ApiOperation, ApiTags } from "@nestjs/swagger"
import { Auth, CurrentUser, type AuthUser } from "../../shared/index.js"
import { UsersService, type UserView } from "../users/index.js"
import { AuthResult, AuthService } from "./auth.service.js"
import { LoginDto, RegisterDto } from "./dto/auth.dto.js"

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
  ) {}

  @Post("register")
  @ApiOperation({ summary: "Create an account and get a token" })
  register(@Body() dto: RegisterDto): Promise<AuthResult> {
    return this.auth.register(dto)
  }

  @Post("login")
  @HttpCode(200)
  @ApiOperation({ summary: "Log in and get a token" })
  login(@Body() dto: LoginDto): Promise<AuthResult> {
    return this.auth.login(dto)
  }

  @Get("me")
  @Auth()
  @ApiOperation({ summary: "Who am I (validates the token)" })
  me(@CurrentUser() user: AuthUser | null): Promise<UserView> {
    return this.users.getView(user!.id)
  }
}
