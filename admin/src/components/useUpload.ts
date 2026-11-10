import { App } from "antd"
import { useCallback, useEffect, useRef, useState } from "react"
import { describeError } from "@/api/errors"
import { uploadFile, type UploadKind, type UploadResult } from "@/api/upload"

/** Uploads one file at a time for a form field, with progress and an error message. */
export function useUpload(kind: UploadKind) {
  const { notification } = App.useApp()
  const [progress, setProgress] = useState<number | null>(null)
  const controller = useRef<AbortController | null>(null)

  const upload = useCallback(
    async (file: File): Promise<UploadResult | null> => {
      controller.current?.abort()
      const own = new AbortController()
      controller.current = own
      setProgress(0)
      try {
        return await uploadFile(file, kind, { onProgress: setProgress, signal: own.signal })
      } catch (error) {
        if (!(error instanceof DOMException)) {
          notification.error({ message: "Tải lên thất bại", description: describeError(error) })
        }
        return null
      } finally {
        if (controller.current === own) setProgress(null)
      }
    },
    [kind, notification],
  )

  // Leaving the page stops an upload that is still running.
  useEffect(() => () => controller.current?.abort(), [])

  return { upload, progress, uploading: progress !== null }
}
