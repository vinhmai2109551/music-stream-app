import { createId } from "@paralleldrive/cuid2"
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  Optional,
  ServiceUnavailableException,
} from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { PresignUploadDto } from "./dto/presign-upload.dto.js"
import { createR2Storage, OBJECT_STORAGE, type ObjectStorage } from "./object-storage.js"
import {
  avatarKeyOf,
  buildAvatarKey,
  buildObjectKey,
  checkUpload,
  isUnderPublicUrl,
} from "./upload-rules.js"
import { readUploadsConfig, type UploadsConfig } from "./uploads.config.js"

export interface PresignedUpload {
  uploadUrl: string
  publicUrl: string
  key: string
}

/** The file a user wants to upload as their profile picture. */
export interface AvatarUploadRequest {
  contentType: string
  sizeBytes: number
}

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name)
  private readonly settings: UploadsConfig
  private readonly storage: ObjectStorage | null

  constructor(config: ConfigService, @Optional() @Inject(OBJECT_STORAGE) storage?: ObjectStorage) {
    this.settings = readUploadsConfig(config)
    this.storage = storage ?? (this.settings.r2 ? createR2Storage(this.settings.r2) : null)
  }

  /** Creates a short-lived URL the admin client can PUT one file to, straight into R2. */
  async presign(dto: PresignUploadDto): Promise<PresignedUpload> {
    const ready = this.ready()

    const check = checkUpload(dto.kind, dto.contentType, dto.sizeBytes)
    if (!check.ok) throw new BadRequestException(check.message)

    const key = buildObjectKey({
      kind: dto.kind,
      extension: check.extension,
      id: createId(),
      now: new Date(),
    })
    return this.issue(ready, key, check.contentType, dto.sizeBytes)
  }

  /** The same for a profile picture: small, an image, and in the folder of the user it is for. */
  async presignAvatar(userId: string, request: AvatarUploadRequest): Promise<PresignedUpload> {
    const ready = this.ready()

    const check = checkUpload("avatar", request.contentType, request.sizeBytes)
    if (!check.ok) throw new BadRequestException(check.message)

    const key = buildAvatarKey({ userId, extension: check.extension, id: createId() })
    return this.issue(ready, key, check.contentType, request.sizeBytes)
  }

  /**
   * For the users module: an avatar saved through the API must be a file this user uploaded with
   * `presignAvatar`, not someone else's picture and not an outside address. That is a stricter
   * `assertManagedUrls` (same bucket, plus the user's own folder), with a message that names the
   * user's endpoint. Skipped while R2_PUBLIC_URL is not configured (development).
   */
  assertAvatarOf(userId: string, avatarUrl: string | undefined): void {
    if (avatarUrl === undefined) return
    const { publicUrl } = this.settings
    if (publicUrl && avatarKeyOf(avatarUrl, publicUrl, userId) === null) {
      throw new BadRequestException(
        `avatarUrl must be a picture you uploaded (${publicUrl}/avatars/${userId}/...). ` +
          "Upload it with POST /users/me/avatar/presign first.",
      )
    }
  }

  /**
   * Deletes an avatar the user replaced. Anything that is not one of the user's own avatars is
   * left alone. Never throws: a file that stays behind is only worth a log line.
   */
  async deleteAvatar(userId: string, avatarUrl: string | null): Promise<void> {
    const { publicUrl } = this.settings
    if (!avatarUrl || !publicUrl || !this.storage) return
    const key = avatarKeyOf(avatarUrl, publicUrl, userId)
    if (!key) return
    try {
      await this.storage.remove(key)
    } catch (error) {
      this.logger.warn(`Could not delete the old avatar ${key}: ${(error as Error).message}`)
    }
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

  private ready(): { storage: ObjectStorage; publicUrl: string } {
    const { storage } = this
    const { publicUrl } = this.settings
    if (!storage || !publicUrl) {
      throw new ServiceUnavailableException("File uploads are not configured (R2_* settings)")
    }
    return { storage, publicUrl }
  }

  private async issue(
    { storage, publicUrl }: { storage: ObjectStorage; publicUrl: string },
    key: string,
    contentType: string,
    sizeBytes: number,
  ): Promise<PresignedUpload> {
    const uploadUrl = await storage.presignPut({ key, contentType, sizeBytes })
    return { uploadUrl, publicUrl: `${publicUrl}/${key}`, key }
  }
}
