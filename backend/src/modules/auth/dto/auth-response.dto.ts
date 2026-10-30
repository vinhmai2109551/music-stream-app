import { ApiProperty } from "@nestjs/swagger"

/** Response shapes, declared as classes only so Swagger can document them. */
export class AuthUserDto {
  @ApiProperty({ example: "cm0abc123" })
  id!: string

  @ApiProperty({ example: "ashley@example.com" })
  email!: string

  @ApiProperty({ example: "Ashley Scott" })
  name!: string

  @ApiProperty({ type: String, nullable: true })
  avatarUrl!: string | null

  @ApiProperty({ enum: ["USER", "ADMIN"] })
  role!: "USER" | "ADMIN"

  @ApiProperty()
  isPremium!: boolean
}

export class TokenPairDto {
  @ApiProperty({ description: "JWT, valid for JWT_ACCESS_EXPIRES_IN (default 15 minutes)" })
  accessToken!: string

  @ApiProperty({
    description:
      "Opaque random string (not a JWT), valid for REFRESH_TOKEN_TTL_DAYS (default 30). " +
      "Single use: every refresh returns a new one.",
  })
  refreshToken!: string
}

export class AuthResponseDto extends TokenPairDto {
  @ApiProperty({ type: AuthUserDto })
  user!: AuthUserDto
}
