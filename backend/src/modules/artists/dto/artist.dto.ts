import { PartialType } from "@nestjs/swagger"
import { IsInt, IsOptional, IsString, IsUrl, MaxLength, Min, MinLength } from "class-validator"

export class CreateArtistDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string

  @IsUrl()
  imageUrl!: string

  /** Followers that exist outside this app. */
  @IsOptional()
  @IsInt()
  @Min(0)
  baseFollowers?: number
}

export class UpdateArtistDto extends PartialType(CreateArtistDto) {}
