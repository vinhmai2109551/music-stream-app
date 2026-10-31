import { ApiProperty } from "@nestjs/swagger"
import { IsIn, IsInt, IsString, Max, MaxLength, Min } from "class-validator"
import { UPLOAD_KINDS, type UploadKind } from "../upload-rules.js"

/** Upper bound on the declared size; the exact per-kind limit is checked by `checkUpload`. */
const HARD_MAX_BYTES = 1024 * 1024 * 1024

export class PresignUploadDto {
  /** `audio` (mp3, m4a, aac - max 20 MB) or `image` (jpeg, png, webp - max 5 MB). */
  @ApiProperty({ enum: UPLOAD_KINDS })
  @IsIn(UPLOAD_KINDS)
  kind!: UploadKind

  /** MIME type of the file, e.g. `audio/mpeg` or `image/png`. */
  @IsString()
  @MaxLength(100)
  contentType!: string

  /** Exact size of the file in bytes. The upload URL only accepts a body of this length. */
  @IsInt()
  @Min(1)
  @Max(HARD_MAX_BYTES)
  sizeBytes!: number
}

export class PresignedUploadDto {
  @ApiProperty({ description: "PUT the file here. Valid for 5 minutes." })
  uploadUrl!: string

  @ApiProperty({ description: "Where the file is served from once uploaded. Store this URL." })
  publicUrl!: string

  @ApiProperty({ example: "audio/2026/10/clx1abc2d0000.mp3" })
  key!: string
}
