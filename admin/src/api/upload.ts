import { api } from "./http"
import { ApiError } from "./errors"

export type UploadKind = "audio" | "image"

const MEGABYTE = 1024 * 1024

interface UploadRule {
  maxBytes: number
  /** Allowed content types (what the API accepts) and the file extensions that stand for them. */
  types: Readonly<Record<string, readonly string[]>>
  label: string
}

/** The limits of `POST /uploads/presign` (backend upload-rules.ts); checked here to fail fast. */
export const UPLOAD_RULES: Readonly<Record<UploadKind, UploadRule>> = {
  audio: {
    maxBytes: 20 * MEGABYTE,
    types: { "audio/mpeg": ["mp3"], "audio/mp4": ["m4a"], "audio/aac": ["aac"] },
    label: "âm thanh (mp3, m4a, aac, tối đa 20 MB)",
  },
  image: {
    maxBytes: 5 * MEGABYTE,
    types: { "image/jpeg": ["jpg", "jpeg"], "image/png": ["png"], "image/webp": ["webp"] },
    label: "ảnh (jpeg, png, webp, tối đa 5 MB)",
  },
}

/** The `accept` attribute of a file input for this kind. */
export const acceptFor = (kind: UploadKind): string =>
  Object.keys(UPLOAD_RULES[kind].types).join(",")

export interface FileInfo {
  name: string
  type: string
  size: number
}

export type FileCheck = { ok: true; contentType: string } | { ok: false; message: string }

/**
 * Browsers disagree about the type of an audio file (a .m4a is often `audio/x-m4a`, a .mp3 may be
 * `audio/mp3`), so a type the API does not know is tried again through the file extension.
 */
export function resolveContentType(file: FileInfo, kind: UploadKind): string | null {
  const { types } = UPLOAD_RULES[kind]
  const declared = file.type.trim().toLowerCase()
  if (declared in types) return declared
  const extension = file.name.split(".").pop()?.toLowerCase() ?? ""
  return Object.entries(types).find(([, extensions]) => extensions.includes(extension))?.[0] ?? null
}

/** Checks the type and the size of a file against the rules of its kind. */
export function checkFile(file: FileInfo, kind: UploadKind): FileCheck {
  const rule = UPLOAD_RULES[kind]
  const contentType = resolveContentType(file, kind)
  if (contentType === null) {
    return { ok: false, message: `Chỉ nhận file ${rule.label}.` }
  }
  if (file.size <= 0) return { ok: false, message: "File rỗng." }
  if (file.size > rule.maxBytes) {
    const limit = rule.maxBytes / MEGABYTE
    const actual = (file.size / MEGABYTE).toFixed(1)
    return { ok: false, message: `File ${actual} MB vượt giới hạn ${limit} MB.` }
  }
  return { ok: true, contentType }
}

interface PresignedUpload {
  uploadUrl: string
  publicUrl: string
  key: string
}

export interface UploadOptions {
  /** Called with 0-100 while the file is sent. */
  onProgress?: (percent: number) => void
  signal?: AbortSignal
}

export interface UploadResult {
  /** Where the file is served from; save this in the track, album or artist. */
  publicUrl: string
  /** Length of an audio file in whole seconds (read from the file); only for kind `audio`. */
  durationSec?: number
}

const STORAGE_ERROR =
  "Không tải được file lên kho lưu trữ. Kiểm tra mạng và cấu hình CORS (cho phép PUT) của bucket R2."

/**
 * Uploads a file straight to the object storage: checks it, asks the API for a presigned URL, then
 * sends the bytes with `PUT` (the header and the length must be exactly what was declared).
 * For audio the length of the song is read from the file first.
 */
export async function uploadFile(
  file: File,
  kind: UploadKind,
  options: UploadOptions = {},
): Promise<UploadResult> {
  const check = checkFile(file, kind)
  if (!check.ok) throw new ApiError(400, check.message)

  const durationSec = kind === "audio" ? await readAudioDuration(file) : undefined
  const presigned = await api<PresignedUpload>("/uploads/presign", {
    method: "POST",
    body: { kind, contentType: check.contentType, sizeBytes: file.size },
    signal: options.signal,
  })
  await putFile(presigned.uploadUrl, file, check.contentType, options)
  return { publicUrl: presigned.publicUrl, durationSec }
}

function putFile(
  url: string,
  file: File,
  contentType: string,
  { onProgress, signal }: UploadOptions,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open("PUT", url)
    request.setRequestHeader("Content-Type", contentType)
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100))
    }
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress?.(100)
        resolve()
      } else {
        reject(new ApiError(request.status, `Kho lưu trữ từ chối file (mã ${request.status}).`))
      }
    }
    request.onerror = () => reject(new ApiError(0, STORAGE_ERROR))
    request.onabort = () => reject(new DOMException("Đã huỷ tải lên.", "AbortError"))
    signal?.addEventListener("abort", () => request.abort(), { once: true })
    request.send(file)
  })
}

const METADATA_TIMEOUT_MS = 15_000

/** Length of an audio file in whole seconds, read from its metadata (at least 1). */
export function readAudioDuration(file: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const audio = new Audio()
    const finish = () => {
      window.clearTimeout(timer)
      audio.removeAttribute("src")
      URL.revokeObjectURL(url)
    }
    const fail = () => {
      finish()
      reject(new ApiError(400, "Không đọc được thời lượng của file âm thanh. File có thể bị hỏng."))
    }
    const timer = window.setTimeout(fail, METADATA_TIMEOUT_MS)
    audio.preload = "metadata"
    audio.onloadedmetadata = () => {
      const seconds = Math.round(audio.duration)
      finish()
      if (Number.isFinite(seconds) && seconds >= 1) resolve(seconds)
      else reject(new ApiError(400, "Không đọc được thời lượng của file âm thanh."))
    }
    audio.onerror = fail
    audio.src = url
  })
}
