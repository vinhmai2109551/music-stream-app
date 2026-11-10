/**
 * What may be uploaded and where it is stored. Pure functions (no Nest, no I/O) so the rules are
 * trivial to unit test.
 */
export type UploadKind = "audio" | "image" | "avatar"

/** What an admin may ask for through `POST /uploads/presign`; avatars have their own endpoint. */
export type AdminUploadKind = Exclude<UploadKind, "avatar">

export const UPLOAD_KINDS: readonly AdminUploadKind[] = ["audio", "image"]

const MEGABYTE = 1024 * 1024

const IMAGE_TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const

interface UploadRule {
  maxBytes: number
  /** Allowed content types and the file extension used for each. */
  extensions: Readonly<Record<string, string>>
}

export const UPLOAD_RULES: Readonly<Record<UploadKind, UploadRule>> = {
  audio: {
    maxBytes: 20 * MEGABYTE,
    extensions: { "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/aac": "aac" },
  },
  image: { maxBytes: 5 * MEGABYTE, extensions: IMAGE_TYPES },
  // The app shrinks a profile picture to about 512 px before uploading it.
  avatar: { maxBytes: 2 * MEGABYTE, extensions: IMAGE_TYPES },
}

export type UploadCheck =
  { ok: true; contentType: string; extension: string } | { ok: false; message: string }

/** Checks a requested upload against the whitelist and the size limit of its kind. */
export function checkUpload(kind: UploadKind, contentType: string, sizeBytes: number): UploadCheck {
  const rule = UPLOAD_RULES[kind]
  const normalized = contentType.trim().toLowerCase()
  const extension = rule.extensions[normalized]

  if (!extension) {
    const allowed = Object.keys(rule.extensions).join(", ")
    return { ok: false, message: `${kind} uploads must be one of: ${allowed}` }
  }
  if (!Number.isInteger(sizeBytes) || sizeBytes <= 0) {
    return { ok: false, message: "sizeBytes must be a positive whole number" }
  }
  if (sizeBytes > rule.maxBytes) {
    return { ok: false, message: `${kind} files can be at most ${rule.maxBytes / MEGABYTE} MB` }
  }
  return { ok: true, contentType: normalized, extension }
}

/** `{kind}/{yyyy}/{mm}/{id}.{ext}` in UTC, e.g. `audio/2026/10/clx1abc.mp3`. */
export function buildObjectKey(params: {
  kind: AdminUploadKind
  extension: string
  id: string
  now: Date
}): string {
  const { kind, extension, id, now } = params
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, "0")
  return `${kind}/${year}/${month}/${id}.${extension}`
}

/** `avatars/{userId}/{id}.{ext}`: the pictures of each user live in a folder of their own. */
export function buildAvatarKey(params: { userId: string; extension: string; id: string }): string {
  return `avatars/${params.userId}/${params.id}.${params.extension}`
}

/** What `buildAvatarKey` makes of an id: lowercase letters and digits, then a known extension. */
const AVATAR_FILE = /^[a-z0-9]+\.(?:jpg|png|webp)$/

/**
 * The object key of `url` when it is one of this user's own avatars in the bucket, else null.
 * A query string, a fragment, an encoded character or a path that leaves the user's folder
 * (`..`) all count as "not ours".
 */
export function avatarKeyOf(url: string, publicUrl: string, userId: string): string | null {
  if (!isUnderPublicUrl(url, publicUrl)) return null
  try {
    const parsed = new URL(url)
    if (parsed.search || parsed.hash) return null
    const basePath = new URL(publicUrl).pathname.replace(/\/?$/, "/")
    const key = parsed.pathname.slice(basePath.length)
    const folder = `avatars/${userId}/`
    if (!key.startsWith(folder)) return null
    return AVATAR_FILE.test(key.slice(folder.length)) ? key : null
  } catch {
    return null
  }
}

/** True when `url` is a file served from `publicUrl` (the R2 public bucket address). */
export function isUnderPublicUrl(url: string, publicUrl: string): boolean {
  try {
    const base = new URL(publicUrl).href.replace(/\/?$/, "/")
    const href = new URL(url).href
    // Longer than the base: the bucket root itself is not a file.
    return href.length > base.length && href.startsWith(base)
  } catch {
    return false
  }
}
