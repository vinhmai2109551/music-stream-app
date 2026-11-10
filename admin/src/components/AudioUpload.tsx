import { UploadOutlined } from "@ant-design/icons"
import { Button, Progress, Space, Typography } from "antd"
import { useRef } from "react"
import { acceptFor, type UploadResult } from "@/api/upload"
import { useUpload } from "./useUpload"

interface Props {
  /** URL of the audio file (what the form saves). Plugs into `Form.Item`. */
  value?: string | null
  onChange?: (url: string) => void
  /** Called after an upload with the length read from the file, to fill the duration field. */
  onUploaded?: (result: UploadResult) => void
  disabled?: boolean
}

/** Picks an audio file, uploads it to the storage, and previews it with a player. */
export function AudioUpload({ value, onChange, onUploaded, disabled }: Props) {
  const { upload, progress, uploading } = useUpload("audio")
  const input = useRef<HTMLInputElement>(null)

  const pick = async (file: File | undefined) => {
    if (!file) return
    const result = await upload(file)
    if (!result) return
    onChange?.(result.publicUrl)
    onUploaded?.(result)
  }

  return (
    <Space direction="vertical" size={8} style={{ width: "100%" }}>
      {value ? <audio controls preload="metadata" src={value} style={{ width: "100%" }} /> : null}
      <input
        ref={input}
        type="file"
        accept={acceptFor("audio")}
        hidden
        onChange={(event) => {
          void pick(event.target.files?.[0])
          event.target.value = "" // the same file can be chosen again
        }}
      />
      <Button
        icon={<UploadOutlined />}
        loading={uploading}
        disabled={disabled}
        onClick={() => input.current?.click()}
      >
        {value ? "Đổi file âm thanh" : "Tải file âm thanh lên"}
      </Button>
      {progress !== null ? <Progress percent={progress} size="small" /> : null}
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        MP3, M4A hoặc AAC, tối đa 20 MB. Thời lượng được đọc tự động từ file.
      </Typography.Text>
    </Space>
  )
}
