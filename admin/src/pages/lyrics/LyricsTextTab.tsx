import { Alert, Button, Input, Popconfirm, Select, Space, Typography } from "antd"
import { useState } from "react"
import { LYRICS_LANGUAGES } from "@/lib/languages"
import { splitLines } from "@/lib/lyrics-text"
import type { Draft } from "./draft"

interface Props {
  draft: Draft
  onLanguage: (language: string) => void
  onApply: (lines: string[]) => void
}

/** The raw text of the lyrics: paste it, pick the language, apply. One line of text = one line. */
export function LyricsTextTab({ draft, onLanguage, onApply }: Props) {
  // The text is edited here and only applied on request: changing the number of lines drops the
  // timings, which must not happen on every key press.
  const [text, setText] = useState(() => draft.lines.join("\n"))
  const lines = splitLines(text)
  const current = draft.lines.join("\n")
  const changed = text !== current
  const dropsTimings =
    changed && draft.timingsMs !== null && lines.length !== draft.timingsMs.length

  const apply = () => {
    onApply(lines)
    setText(lines.join("\n"))
  }

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Space wrap>
        <Typography.Text strong>Ngôn ngữ của lời:</Typography.Text>
        <Select
          value={draft.language}
          onChange={onLanguage}
          options={LYRICS_LANGUAGES.map((language) => ({ ...language }))}
          style={{ minWidth: 180 }}
        />
      </Space>

      <Input.TextArea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={18}
        placeholder={
          "Dán lời bài hát vào đây.\nMỗi dòng là một dòng lời; dòng trống ngăn cách các đoạn."
        }
        style={{ fontFamily: "inherit" }}
        aria-label="Lời bài hát"
      />

      {dropsTimings ? (
        <Alert
          type="warning"
          showIcon
          message="Số dòng đã thay đổi"
          description="Áp dụng sẽ xoá các mốc thời gian đã có, vì chúng gắn với từng dòng. Bạn cần đồng bộ lại."
        />
      ) : null}

      <Space wrap>
        {dropsTimings ? (
          <Popconfirm
            title="Xoá mốc thời gian?"
            description="Số dòng khác trước nên các mốc cũ không còn khớp."
            okText="Áp dụng"
            cancelText="Huỷ"
            onConfirm={apply}
          >
            <Button type="primary">Áp dụng lời</Button>
          </Popconfirm>
        ) : (
          <Button type="primary" disabled={!changed} onClick={apply}>
            Áp dụng lời
          </Button>
        )}
        <Button disabled={!changed} onClick={() => setText(current)}>
          Bỏ thay đổi
        </Button>
        <Typography.Text type="secondary">
          {lines.length} dòng · {lines.filter((line) => line.trim() !== "").length} dòng có lời
        </Typography.Text>
      </Space>
    </Space>
  )
}
