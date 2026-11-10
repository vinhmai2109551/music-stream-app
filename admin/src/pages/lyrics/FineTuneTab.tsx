import { CaretRightOutlined, MinusOutlined, PauseOutlined, PlusOutlined } from "@ant-design/icons"
import { Alert, Button, Empty, Input, Segmented, Space, Table, Typography } from "antd"
import { useState } from "react"
import { isBlank } from "@/lib/lyrics-text"
import { activeIndex } from "@/lib/tap-sync"
import { formatClock, parseClock } from "@/lib/time"
import type { Draft } from "./draft"
import { LyricLines } from "./LyricLines"
import type { MediaController } from "./media"

/** One press of −0.1s / +0.1s. */
export const NUDGE_MS = 100

interface Props {
  draft: Draft
  controller: MediaController | null
  nowMs: number
  onSetTiming: (index: number, timeMs: number) => void
  onNudge: (index: number, deltaMs: number) => void
  onSetLine: (index: number, text: string) => void
}

interface Row {
  index: number
  text: string
  timeMs: number
}

/** A time that can be typed (`mm:ss.xx`); it is applied when the field is left or Enter is hit. */
function TimeField({ value, onCommit }: { value: number; onCommit: (ms: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null)
  const parsed = draft === null ? value : parseClock(draft)
  return (
    <Input
      size="small"
      value={draft ?? formatClock(value)}
      status={parsed === null ? "error" : undefined}
      style={{ width: 104, fontVariantNumeric: "tabular-nums" }}
      aria-label="Mốc thời gian"
      onChange={(event) => setDraft(event.target.value)}
      onFocus={(event) => event.target.select()}
      onBlur={() => {
        if (draft !== null && parsed !== null && parsed !== value) onCommit(parsed)
        setDraft(null)
      }}
      onPressEnter={(event) => event.currentTarget.blur()}
    />
  )
}

/** Correct the synced lyrics: edit times and text, nudge by 0.1 s, play from a line, or preview. */
export function FineTuneTab({ draft, controller, nowMs, onSetTiming, onNudge, onSetLine }: Props) {
  const [view, setView] = useState<"edit" | "preview">("edit")
  const { lines, timingsMs } = draft

  if (lines.length === 0) {
    return <Empty description="Chưa có lời. Dán lời ở tab Lời trước." />
  }
  if (timingsMs === null) {
    return (
      <Alert
        type="info"
        showIcon
        message="Chưa có mốc thời gian"
        description="Đồng bộ lời ở tab Đồng bộ, hoặc nhập một file LRC, rồi quay lại đây để tinh chỉnh."
      />
    )
  }

  const current = nowMs >= 0 ? activeIndex(timingsMs, nowMs) : -1
  const playFrom = (index: number) => {
    controller?.seekToMs(timingsMs[index])
    controller?.play()
  }
  const rows: Row[] = lines.map((text, index) => ({ index, text, timeMs: timingsMs[index] }))

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Space wrap>
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { label: "Chỉnh sửa", value: "edit" },
            { label: "Xem trước (chạy theo nhạc)", value: "preview" },
          ]}
        />
        <Button
          icon={controller?.isPlaying() ? <PauseOutlined /> : <CaretRightOutlined />}
          disabled={!controller}
          onClick={() => (controller?.isPlaying() ? controller.pause() : controller?.play())}
        >
          Phát / Dừng
        </Button>
        <Typography.Text type="secondary">{formatClock(Math.max(0, nowMs))}</Typography.Text>
      </Space>

      {view === "preview" ? (
        <LyricLines
          lines={lines}
          highlight={current}
          height={440}
          fontSize={20}
          onSelect={(index) => playFrom(index)}
        />
      ) : (
        <Table<Row>
          size="small"
          rowKey="index"
          dataSource={rows}
          pagination={false}
          scroll={{ y: 460, x: "max-content" }}
          rowClassName={(row) => (row.index === current ? "ant-table-row-selected" : "")}
          columns={[
            { title: "#", dataIndex: "index", width: 52, render: (index: number) => index + 1 },
            {
              title: "Thời gian",
              width: 130,
              render: (_, row) => (
                <TimeField value={row.timeMs} onCommit={(ms) => onSetTiming(row.index, ms)} />
              ),
            },
            {
              title: "Chỉnh",
              width: 130,
              render: (_, row) => (
                <Space size={4}>
                  <Button
                    size="small"
                    icon={<MinusOutlined />}
                    onClick={() => onNudge(row.index, -NUDGE_MS)}
                    aria-label="Lùi 0,1 giây"
                  >
                    0.1s
                  </Button>
                  <Button
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => onNudge(row.index, NUDGE_MS)}
                    aria-label="Tiến 0,1 giây"
                  >
                    0.1s
                  </Button>
                </Space>
              ),
            },
            {
              title: "Phát",
              width: 64,
              render: (_, row) => (
                <Button
                  size="small"
                  icon={<CaretRightOutlined />}
                  disabled={!controller}
                  onClick={() => playFrom(row.index)}
                  aria-label="Phát từ dòng này"
                />
              ),
            },
            {
              title: "Lời",
              render: (_, row) => (
                <Input
                  size="small"
                  value={row.text}
                  placeholder={isBlank(row.text) ? "(dòng trống)" : undefined}
                  style={{ minWidth: 260 }}
                  aria-label={`Lời dòng ${row.index + 1}`}
                  onChange={(event) => onSetLine(row.index, event.target.value)}
                />
              ),
            },
          ]}
        />
      )}
    </Space>
  )
}
