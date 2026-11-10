import { PictureOutlined, UploadOutlined } from "@ant-design/icons"
import { Button, Image, Progress, Space, Typography, theme } from "antd"
import { useRef } from "react"
import { acceptFor } from "@/api/upload"
import { useUpload } from "./useUpload"

interface Props {
  /** URL of the picture (what the form saves). Plugs into `Form.Item`. */
  value?: string | null
  onChange?: (url: string) => void
  /** Side of the square preview in px. */
  size?: number
  disabled?: boolean
}

/** Picks an image, uploads it to the storage and keeps its public URL; shows a preview. */
export function ImageUpload({ value, onChange, size = 160, disabled }: Props) {
  const { upload, progress, uploading } = useUpload("image")
  const input = useRef<HTMLInputElement>(null)
  const { token } = theme.useToken()

  const pick = async (file: File | undefined) => {
    if (!file) return
    const result = await upload(file)
    if (result) onChange?.(result.publicUrl)
  }

  return (
    <Space direction="vertical" size={8}>
      {value ? (
        <Image
          src={value}
          alt="Ảnh xem trước"
          width={size}
          height={size}
          style={{ objectFit: "cover", borderRadius: token.borderRadius }}
        />
      ) : (
        <div
          style={{
            width: size,
            height: size,
            display: "grid",
            placeItems: "center",
            border: `1px dashed ${token.colorBorder}`,
            borderRadius: token.borderRadius,
            color: token.colorTextTertiary,
          }}
        >
          <Space direction="vertical" align="center" size={4}>
            <PictureOutlined style={{ fontSize: 28 }} />
            <Typography.Text type="secondary">Chưa có ảnh</Typography.Text>
          </Space>
        </div>
      )}
      <input
        ref={input}
        type="file"
        accept={acceptFor("image")}
        style={{ display: "none" }}
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
        {value ? "Đổi ảnh" : "Tải ảnh lên"}
      </Button>
      {progress !== null ? (
        <Progress percent={progress} size="small" style={{ width: size }} />
      ) : null}
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        JPEG, PNG hoặc WebP, tối đa 5 MB
      </Typography.Text>
    </Space>
  )
}
