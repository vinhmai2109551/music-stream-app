import { IsOptional, IsString, IsUrl, MaxLength, MinLength } from "class-validator"

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string

  @IsOptional()
  @IsUrl()
  avatarUrl?: string
}
