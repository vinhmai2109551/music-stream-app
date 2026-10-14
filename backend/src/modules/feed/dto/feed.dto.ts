import { IsOptional, IsString, IsUrl, MaxLength } from "class-validator"

export class CreateFeedPostDto {
  @IsString()
  artistId!: string

  @IsString()
  trackId!: string

  @IsUrl()
  artworkUrl!: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  caption?: string
}
