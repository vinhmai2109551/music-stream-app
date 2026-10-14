import { PartialType } from "@nestjs/swagger"
import {
  ArrayUnique,
  IsArray,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from "class-validator"
import { PaginationQueryDto } from "../../../shared/index.js"

export class CreateAlbumDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string

  @IsString()
  artistId!: string

  @IsUrl()
  coverUrl!: string

  /** Track ids in play order. */
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  trackIds?: string[]
}

export class UpdateAlbumDto extends PartialType(CreateAlbumDto) {}

export class ListAlbumsQueryDto extends PaginationQueryDto {
  /** Only albums of this artist. */
  @IsOptional()
  @IsString()
  artistId?: string
}
