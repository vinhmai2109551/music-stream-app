import { TranslationOutlined } from "@ant-design/icons"
import { Alert, Button, Drawer, Select, Skeleton, Space, Table, Tag, Typography } from "antd"
import { useState } from "react"
import { describeError } from "@/api/errors"
import type { LyricsTranslation } from "@/api/types"
import { LYRICS_LANGUAGES } from "@/lib/languages"
import { fetchTranslation } from "./lyricsApi"

interface Props {
  trackId: string
  /** The language of the saved lyrics: translating to it is pointless. */
  language: string
  /** The draft differs from what is saved; the translation is of the saved text. */
  unsaved: boolean
  /** There are saved lyrics to translate. */
  hasSaved: boolean
  originalLines: readonly string[]
}

interface Row {
  index: number
  original: string
  translated: string
}

/** Shows the translation of the SAVED lyrics next to the original, in a side panel. */
export function TranslationDrawer({ trackId, language, unsaved, hasSaved, originalLines }: Props) {
  const [open, setOpen] = useState(false)
  const [target, setTarget] = useState<string | undefined>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<LyricsTranslation | null>(null)

  const translate = async (lang: string) => {
    setTarget(lang)
    setLoading(true)
    setError(null)
    try {
      setResult(await fetchTranslation(trackId, lang))
    } catch (reason) {
      setResult(null)
      setError(describeError(reason))
    } finally {
      setLoading(false)
    }
  }

  const rows: Row[] = result
    ? result.lines.map((translated, index) => ({
        index,
        original: originalLines[index] ?? "",
        translated,
      }))
    : []

  return (
    <>
      <Button icon={<TranslationOutlined />} disabled={!hasSaved} onClick={() => setOpen(true)}>
        Xem bản dịch
      </Button>
      <Drawer
        title="Bản dịch lời bài hát"
        open={open}
        onClose={() => setOpen(false)}
        width={Math.min(720, window.innerWidth)}
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          {unsaved ? (
            <Alert
              type="warning"
              showIcon
              message="Bản dịch là của lời đã lưu"
              description="Bạn có thay đổi chưa lưu. Hãy lưu lời trước để bản dịch khớp với bản đang soạn."
            />
          ) : null}
          <Space wrap>
            <Typography.Text>Dịch sang:</Typography.Text>
            <Select
              value={target}
              placeholder="Chọn ngôn ngữ"
              style={{ minWidth: 180 }}
              disabled={loading}
              onChange={(lang: string) => void translate(lang)}
              options={LYRICS_LANGUAGES.filter((item) => item.value !== language).map((item) => ({
                ...item,
              }))}
            />
          </Space>
          <Typography.Text type="secondary">
            Bản dịch được dịch một lần rồi lưu lại. Lần đầu dịch một ngôn ngữ sẽ tốn hạn mức DeepL
            hằng tháng.
          </Typography.Text>

          {loading ? <Skeleton active paragraph={{ rows: 8 }} /> : null}
          {error ? (
            <Alert type="error" showIcon message="Không dịch được" description={error} />
          ) : null}
          {result && !loading ? (
            <>
              <Space wrap>
                <Tag color={result.cached ? "blue" : "green"}>
                  {result.cached ? "Đã có sẵn" : "Vừa dịch"}
                </Tag>
                <Tag>{result.provider === "original" ? "Không cần dịch" : result.provider}</Tag>
              </Space>
              <Table<Row>
                size="small"
                rowKey="index"
                dataSource={rows}
                pagination={false}
                scroll={{ y: 520 }}
                columns={[
                  { title: "Bản gốc", dataIndex: "original" },
                  { title: "Bản dịch", dataIndex: "translated" },
                ]}
              />
            </>
          ) : null}
        </Space>
      </Drawer>
    </>
  )
}
