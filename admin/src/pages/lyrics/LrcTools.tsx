import { DownloadOutlined, UploadOutlined } from "@ant-design/icons"
import { Alert, Button, Input, Modal, Space, Typography } from "antd"
import { useRef, useState } from "react"
import { parseLrc, toLrc } from "@/lib/lrc"
import { draftToSave, type Draft } from "./draft"

interface Props {
  draft: Draft
  /** Name of the file to export, without the extension. */
  fileName: string
  onImport: (lines: string[], timingsMs: number[] | null) => void
}

/** Largest LRC file read; real ones are a few kilobytes. */
const MAX_LRC_BYTES = 512 * 1024

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }))
  const link = document.createElement("a")
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}

/** Import (paste or open a `.lrc` file) and export of lyrics in the LRC format. */
export function LrcTools({ draft, fileName, onImport }: Props) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState("")
  const [fileError, setFileError] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const parsed = text.trim() === "" ? null : parseLrc(text)

  const readFile = async (file: File | undefined) => {
    if (!file) return
    if (file.size > MAX_LRC_BYTES) {
      setFileError("File quá lớn cho một file LRC.")
      return
    }
    setFileError(null)
    setText(await file.text())
  }

  const confirm = () => {
    if (!parsed) return
    onImport(parsed.lines, parsed.timingsMs)
    setOpen(false)
    setText("")
  }

  const exportLrc = () => {
    const { lines, timingsMs } = draftToSave(draft)
    download(`${fileName || "lyrics"}.lrc`, toLrc(lines, timingsMs))
  }

  return (
    <>
      <Space wrap>
        <Button icon={<UploadOutlined />} onClick={() => setOpen(true)}>
          Nhập LRC
        </Button>
        <Button icon={<DownloadOutlined />} disabled={draft.lines.length === 0} onClick={exportLrc}>
          Xuất LRC
        </Button>
      </Space>

      <Modal
        title="Nhập lời từ LRC"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={confirm}
        okText="Nhập"
        cancelText="Huỷ"
        okButtonProps={{ disabled: !parsed }}
        width={640}
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Typography.Text type="secondary">
            Dán nội dung dạng <code>[mm:ss.xx]lời</code> hoặc mở một file .lrc. Lời hiện tại sẽ được
            thay thế.
          </Typography.Text>
          <input
            ref={input}
            type="file"
            accept=".lrc,.txt,text/plain"
            style={{ display: "none" }}
            onChange={(event) => {
              void readFile(event.target.files?.[0])
              event.target.value = ""
            }}
          />
          <Button onClick={() => input.current?.click()}>Chọn file .lrc</Button>
          {fileError ? <Alert type="error" showIcon message={fileError} /> : null}
          <Input.TextArea
            rows={10}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={"[00:12.00]Dòng thứ nhất\n[00:17.50]Dòng thứ hai"}
            aria-label="Nội dung LRC"
          />
          {parsed ? (
            <Alert
              type={parsed.timingsMs ? "success" : "info"}
              showIcon
              message={
                parsed.timingsMs
                  ? `Đọc được ${parsed.lines.length} dòng có mốc thời gian.`
                  : `Đọc được ${parsed.lines.length} dòng, không có mốc thời gian (chỉ nhập lời).`
              }
            />
          ) : null}
        </Space>
      </Modal>
    </>
  )
}
