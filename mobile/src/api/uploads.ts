import { copy } from "@/constants/copy"
import { ApiError, api } from "./client"

const text = copy.account.edit
const UPLOAD_TIMEOUT_MS = 30_000

/** A picture on the device that is ready to become the avatar. */
export interface AvatarFile {
  uri: string
  contentType: string
}

export interface AvatarPresign {
  /** PUT the picture here (valid for 5 minutes, only with the declared type and size). */
  uploadUrl: string
  /** Where the picture is served from once uploaded: the value for `avatarUrl`. */
  publicUrl: string
  key: string
}

export const presignAvatar = (input: { contentType: string; sizeBytes: number }) =>
  api.post<AvatarPresign>("/users/me/avatar/presign", input)

async function readFile(uri: string): Promise<Blob> {
  try {
    const blob = await (await fetch(uri)).blob()
    if (blob.size > 0) return blob
  } catch {
    // Falls through to the same message: the file cannot be used either way.
  }
  throw new ApiError({ status: 0, kind: "network", message: text.readFailed })
}

/** One PUT straight to the bucket: no API token (the URL itself is the permission). */
async function putFile(url: string, blob: Blob, contentType: string): Promise<void> {
  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, UPLOAD_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: blob,
      signal: controller.signal,
    })
  } catch {
    throw new ApiError(
      timedOut
        ? { status: 0, kind: "timeout", message: copy.errors.timeout }
        : { status: 0, kind: "network", message: copy.errors.network },
    )
  } finally {
    clearTimeout(timer)
  }
  if (!response.ok) {
    throw new ApiError({ status: response.status, kind: "http", message: text.uploadFailed })
  }
}

/**
 * Uploads a picture as the user's avatar: asks the API for a presigned URL, then PUTs the file to
 * Cloudflare R2. Returns the address to save as `avatarUrl`; nothing about the profile changes yet.
 */
export async function uploadAvatar(file: AvatarFile): Promise<string> {
  const blob = await readFile(file.uri)
  const { uploadUrl, publicUrl } = await presignAvatar({
    contentType: file.contentType,
    sizeBytes: blob.size,
  })
  await putFile(uploadUrl, blob, file.contentType)
  return publicUrl
}
