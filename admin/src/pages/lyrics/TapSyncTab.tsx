import {
  BackwardOutlined,
  ClearOutlined,
  ForwardOutlined,
  PauseOutlined,
  PlayCircleOutlined,
  RollbackOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons"
import { Alert, App, Button, Progress, Space, Tag, Typography } from "antd"
import { useEffect } from "react"
import { formatClock } from "@/lib/time"
import { applyTap, markedCount, nextPending, wordLineCount } from "@/lib/tap-sync"
import type { Draft } from "./draft"
import { LyricLines } from "./LyricLines"
import type { MediaController } from "./media"

/** How far the arrow keys move the song. */
export const SEEK_STEP_MS = 3000

interface Props {
  draft: Draft
  controller: MediaController | null
  /** Position of the song in ms (-1 when not known). */
  nowMs: number
  /** This tab is the one on screen: the keys only work then. */
  active: boolean
  onTap: (timeMs: number) => void
  onUndo: () => void
  onReset: () => void
}

/** Keys typed into a field are text, not commands. */
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
}

/**
 * Tap along with the song: Space marks the start of the next line, Backspace takes back the last
 * mark, R starts over, the arrows move the song by 3 seconds. The buttons do the same.
 */
export function TapSyncTab({ draft, controller, nowMs, active, onTap, onUndo, onReset }: Props) {
  const { message } = App.useApp()
  const { lines, marks } = draft
  const total = wordLineCount(lines)
  const done = markedCount(lines, marks)
  const pending = nextPending(lines, marks)

  const tap = () => {
    if (!controller) return
    const timeMs = controller.getTimeMs()
    if (pending === null) {
      message.info("Đã ghi mốc cho mọi dòng. Bấm Làm lại (R) nếu muốn đồng bộ lại từ đầu.")
    } else if (applyTap(lines, marks, timeMs) === null) {
      message.warning(
        "Mốc phải muộn hơn mốc của dòng trước. Hãy phát tiếp bài hoặc huỷ mốc vừa ghi.",
      )
    } else {
      onTap(timeMs)
    }
  }

  const seek = (deltaMs: number) => controller?.seekToMs(controller.getTimeMs() + deltaMs)
  const toggle = () => (controller?.isPlaying() ? controller.pause() : controller?.play())

  useEffect(() => {
    if (!active) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTyping(event.target) || event.ctrlKey || event.metaKey || event.altKey) return
      if (event.code === "Space") {
        event.preventDefault()
        if (!event.repeat) tap()
      } else if (event.key === "Backspace") {
        event.preventDefault()
        onUndo()
      } else if (event.key === "r" || event.key === "R") {
        event.preventDefault()
        onReset()
      } else if (event.key === "ArrowLeft") {
        event.preventDefault()
        seek(-SEEK_STEP_MS)
      } else if (event.key === "ArrowRight") {
        event.preventDefault()
        seek(SEEK_STEP_MS)
      }
    }
    // A focused button would also "click" on the key release of Space.
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space" && !isTyping(event.target)) event.preventDefault()
    }
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("keyup", onKeyUp)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)
    }
  })

  if (total === 0) {
    return (
      <Alert
        type="info"
        showIcon
        message="Chưa có lời để đồng bộ"
        description="Hãy dán lời ở tab Lời và bấm Áp dụng trước."
      />
    )
  }

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      {!controller ? (
        <Alert
          type="warning"
          showIcon
          message="Chưa có trình phát. Đợi trình phát tải xong, hoặc thêm nguồn phát cho bài."
        />
      ) : null}

      <Space wrap>
        <Button
          type="primary"
          size="large"
          icon={<ThunderboltOutlined />}
          disabled={!controller || pending === null}
          onClick={tap}
        >
          Ghi mốc (Space)
        </Button>
        <Button icon={<RollbackOutlined />} disabled={done === 0} onClick={onUndo}>
          Huỷ mốc vừa ghi (Backspace)
        </Button>
        <Button icon={<ClearOutlined />} disabled={done === 0} onClick={onReset}>
          Làm lại (R)
        </Button>
        <Button
          icon={<BackwardOutlined />}
          disabled={!controller}
          onClick={() => seek(-SEEK_STEP_MS)}
        >
          −3s (←)
        </Button>
        <Button
          icon={controller?.isPlaying() ? <PauseOutlined /> : <PlayCircleOutlined />}
          disabled={!controller}
          onClick={toggle}
        >
          Phát / Dừng
        </Button>
        <Button
          icon={<ForwardOutlined />}
          disabled={!controller}
          onClick={() => seek(SEEK_STEP_MS)}
        >
          +3s (→)
        </Button>
      </Space>

      <Space wrap align="center">
        <Progress percent={Math.round((done / total) * 100)} style={{ width: 220 }} size="small" />
        <Typography.Text>
          Đã ghi {done}/{total} dòng
        </Typography.Text>
        {nowMs >= 0 ? <Tag>{formatClock(nowMs)}</Tag> : null}
        {draft.timingsMs !== null ? <Tag color="green">Đã đồng bộ xong</Tag> : null}
      </Space>

      <LyricLines
        lines={lines}
        highlight={pending}
        height={380}
        prefix={(index) => (
          <Typography.Text type="secondary" style={{ display: "inline-block", minWidth: 72 }}>
            {marks[index] === null || marks[index] === undefined ? "—" : formatClock(marks[index])}
          </Typography.Text>
        )}
      />
      <Typography.Text type="secondary">
        Dòng được tô sáng là dòng đang chờ mốc. Dòng trống không cần ghi mốc.
      </Typography.Text>
    </Space>
  )
}
