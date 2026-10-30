import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

export const PRESIGN_EXPIRES_SECONDS = 5 * 60

export interface R2Credentials {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucket: string
}

export interface PresignRequest {
  key: string
  contentType: string
  sizeBytes: number
}

/** Returns a function that signs short-lived PUT URLs for one R2 bucket. */
export function createR2Presigner(r2: R2Credentials): (request: PresignRequest) => Promise<string> {
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${r2.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: r2.accessKeyId, secretAccessKey: r2.secretAccessKey },
    // R2 does not understand the extra checksum headers newer SDK versions add by default.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  })

  return ({ key, contentType, sizeBytes }) =>
    // Content-Type and Content-Length are part of the signature: the client must upload exactly
    // the type and size it declared, so the size limit cannot be bypassed after presigning.
    getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket: r2.bucket,
        Key: key,
        ContentType: contentType,
        ContentLength: sizeBytes,
      }),
      {
        expiresIn: PRESIGN_EXPIRES_SECONDS,
        // Not signed by default: without this the client could upload any content type.
        signableHeaders: new Set(["content-type"]),
      },
    )
}
