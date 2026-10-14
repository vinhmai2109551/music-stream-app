import { IsOptional, IsString, MaxLength, MinLength } from "class-validator"

export class CreateCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  text!: string

  /** Comment on a track (player). Exactly one of trackId / postId is required. */
  @IsOptional()
  @IsString()
  trackId?: string

  /** Comment on a feed post. */
  @IsOptional()
  @IsString()
  postId?: string

  /** Reply to another comment on the same track or post. */
  @IsOptional()
  @IsString()
  parentId?: string
}

export class ListCommentsQueryDto {
  @IsOptional()
  @IsString()
  trackId?: string

  @IsOptional()
  @IsString()
  postId?: string
}
