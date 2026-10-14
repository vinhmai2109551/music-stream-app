import { PartialType, PickType } from "@nestjs/swagger"
import { IsBoolean, IsOptional, IsString, IsUrl, MaxLength, MinLength } from "class-validator"

export class CreatePlaylistDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string

  @IsOptional()
  @IsUrl()
  coverUrl?: string

  /** Editorial playlist owned by "Music Stream". Admin only. */
  @IsOptional()
  @IsBoolean()
  isOfficial?: boolean
}

/** Owners can rename and re-describe a playlist; `isOfficial` cannot be changed afterwards. */
export class UpdatePlaylistDto extends PartialType(
  PickType(CreatePlaylistDto, ["name", "description", "coverUrl"] as const),
) {}
