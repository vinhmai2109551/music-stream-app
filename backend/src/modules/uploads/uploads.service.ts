import { createId } from "@paralleldrive/cuid2"
import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { PresignUploadDto } from "./dto/presign-upload.dto.js"
import { createR2Presigner } from "./r2-presigner.js"
import { buildObjectKey, checkUpload, isUnderPublicUrl } from "./upload-rules.js"
import { readUploadsConfig, type UploadsConfig } from "./uploads.config.js"

export interface PresignedUpload {
  uploadUrl: string
  publicUrl: string
  key: string
}

@Injectable()
export class UploadsService {
  private readonly settings: UploadsConfig
  private readonly presigner: ReturnType<typeof createR2Presigner> | null

  constructor(config: ConfigService) {
    this.settings = readUploadsConfig(config)
    this.presigner = this.settings.r2 ? createR2Presigner(this.settings.r2) : null
  }

  /** Creates a short-lived URL the admin client can PUT one file to, straight into R2. */
  async presign(dto: PresignUploadDto): Promise<PresignedUpload> {
    const { presigner } = this
    const { publicUrl } = this.settings
    if (!presigner || !publicUrl) {
      throw new ServiceUnavailableException("File uploads are not configured (R2_* settings)")
    }

    const check = checkUpload(dto.kind, dto.contentType, dto.sizeBytes)
    if (!check.ok) throw new BadRequestException(check.message)

    const key = buildObjectKey({
      kind: dto.kind,
      extension: check.extension,
      id: createId(),
      now: new Date(),
    })
    const uploadUrl = await presigner({
      key,
      contentType: check.contentType,
      sizeBytes: dto.sizeBytes,
    })
    return { uploadUrl, publicUrl: `${publicUrl}/${key}`, key }
  }

  /**
   * For other modules: media URLs saved through the API must point at our bucket. Skipped while
   * R2_PUBLIC_URL is not configured (development). Seed data bypasses this: it writes directly.
   */
  assertManagedUrls(urls: Record<string, string | undefined>): void {
    const { publicUrl } = this.settings
    if (!publicUrl) return
    for (const [field, url] of Object.entries(urls)) {
      if (url !== undefined && !isUnderPublicUrl(url, publicUrl)) {
        throw new BadRequestException(
          `${field} must be a file in our storage (${publicUrl}/...). Upload it with POST /uploads/presign first.`,
        )
      }
    }
  }
}
