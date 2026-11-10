import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from "class-validator"
import { TURNSTILE_TOKEN_MAX } from "../turnstile.service.js"

export class RegisterDto {
  @IsEmail()
  @MaxLength(254)
  email!: string

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string
}

export class LoginDto {
  @IsEmail()
  email!: string

  @IsString()
  @MinLength(1)
  @MaxLength(72)
  password!: string

  /**
   * Token from the Cloudflare Turnstile widget. Required whenever the server has
   * TURNSTILE_SECRET_KEY set; each token works only once.
   */
  @IsOptional()
  @IsString()
  @MaxLength(TURNSTILE_TOKEN_MAX)
  turnstileToken?: string
}

export class RefreshTokenDto {
  /** The refresh token received from login, register or the previous refresh. */
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  refreshToken!: string
}
