import { IsOptional, IsString, MaxLength, MinLength } from "class-validator"
import { CursorQueryDto } from "../../../shared/index.js"

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

  /**
   * Reply to another comment on the same track or post. Replies are one level deep: answering a
   * reply attaches the new comment to the top-level comment of that reply.
   */
  @IsOptional()
  @IsString()
  parentId?: string
}

export class ListCommentsQueryDto extends CursorQueryDto {
  @IsOptional()
  @IsString()
  trackId?: string

  @IsOptional()
  @IsString()
  postId?: string
}
