import { PartialType } from "@nestjs/swagger"
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  MinLength,
} from "class-validator"
import { Region } from "../../../generated/prisma/enums.js"
import { PaginationQueryDto } from "../../../shared/index.js"

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

  /** Where the artist comes from; defaults to GLOBAL. */
  @IsOptional()
  @IsEnum(Region)
  region?: Region
}

export class UpdateArtistDto extends PartialType(CreateArtistDto) {}

export class ListArtistsQueryDto extends PaginationQueryDto {
  /** Only artists from this region. */
  @IsOptional()
  @IsEnum(Region)
  region?: Region
}
