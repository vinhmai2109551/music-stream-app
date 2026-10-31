import type { ConfigService } from "@nestjs/config"
import type { R2Credentials } from "./r2-presigner.js"

export interface UploadsConfig {
  /** Null while R2 is not configured (allowed in development). */
  r2: R2Credentials | null
  /** Public address of the bucket, without a trailing slash. */
  publicUrl: string | null
}

/** Reads the R2_* settings. Empty values count as "not set". */
export function readUploadsConfig(config: ConfigService): UploadsConfig {
  const value = (key: string) => config.get<string>(key)?.trim() || null

  const accountId = value("R2_ACCOUNT_ID")
  const accessKeyId = value("R2_ACCESS_KEY_ID")
  const secretAccessKey = value("R2_SECRET_ACCESS_KEY")
  const bucket = value("R2_BUCKET")
  const publicUrl = value("R2_PUBLIC_URL")?.replace(/\/+$/, "") ?? null

  const r2 =
    accountId && accessKeyId && secretAccessKey && bucket
      ? { accountId, accessKeyId, secretAccessKey, bucket }
      : null
  return { r2, publicUrl }
}
