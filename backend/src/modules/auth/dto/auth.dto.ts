import { IsEmail, IsString, MaxLength, MinLength } from "class-validator"

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
}
