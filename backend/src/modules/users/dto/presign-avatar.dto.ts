import { IsInt, IsString, Max, MaxLength, Min } from "class-validator"

/** Upper bound on the declared size; the exact limit (2 MB) is checked by the `avatar` rule. */
const HARD_MAX_BYTES = 1024 * 1024 * 1024

export class PresignAvatarDto {
  /** MIME type of the picture: `image/jpeg`, `image/png` or `image/webp`. */
  @IsString()
  @MaxLength(100)
  contentType!: string

  /** Exact size of the picture in bytes (at most 2 MB). The upload URL only accepts that length. */
  @IsInt()
  @Min(1)
  @Max(HARD_MAX_BYTES)
  sizeBytes!: number
}
