/**
 * What may be uploaded and where it is stored. Pure functions (no Nest, no I/O) so the rules are
 * trivial to unit test.
 */
export type UploadKind = "audio" | "image"

export const UPLOAD_KINDS: readonly UploadKind[] = ["audio", "image"]

const MEGABYTE = 1024 * 1024

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
  image: {
    maxBytes: 5 * MEGABYTE,
    extensions: { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" },
  },
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
  kind: UploadKind
  extension: string
  id: string
  now: Date
}): string {
  const { kind, extension, id, now } = params
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, "0")
  return `${kind}/${year}/${month}/${id}.${extension}`
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
