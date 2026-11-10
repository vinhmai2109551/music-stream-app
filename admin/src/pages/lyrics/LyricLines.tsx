import { theme } from "antd"
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react"
import { isBlank } from "@/lib/lyrics-text"

interface Props {
  lines: readonly string[]
  /** Index of the line to highlight; -1 or null = none. */
  highlight: number | null
  /** Extra content in front of a line (its time, its mark). */
  prefix?: (index: number) => ReactNode
  onSelect?: (index: number) => void
  height?: number
  /** Keep the highlighted line in the middle of the box as it changes. */
  follow?: boolean
  emptyText?: string
  fontSize?: number
}

/**
 * A scrolling box of lyric lines with one highlighted. The box is scrolled by hand: scrolling the
 * line into view would also move the whole page.
 */
export function LyricLines({
  lines,
  highlight,
  prefix,
  onSelect,
  height = 360,
  follow = true,
  emptyText = "Chưa có lời",
  fontSize = 16,
}: Props) {
  const { token } = theme.useToken()
  const box = useRef<HTMLDivElement>(null)
  const rows = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    if (!follow || highlight === null || highlight < 0) return
    const container = box.current
    const row = rows.current[highlight]
    if (!container || !row) return
    container.scrollTo({
      top: row.offsetTop - container.clientHeight / 2 + row.clientHeight / 2,
      behavior: "smooth",
    })
  }, [highlight, follow])

  if (lines.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: token.colorTextTertiary }}>
        {emptyText}
      </div>
    )
  }

  return (
    <div
      ref={box}
      style={{
        position: "relative",
        height,
        overflowY: "auto",
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadius,
        padding: "8px 0",
      }}
    >
      {lines.map((line, index) => {
        const active = index === highlight
        const style: CSSProperties = {
          display: "flex",
          gap: 12,
          alignItems: "baseline",
          padding: "6px 16px",
          minHeight: isBlank(line) ? 14 : undefined,
          fontSize,
          cursor: onSelect ? "pointer" : undefined,
          background: active ? token.colorPrimaryBg : undefined,
          color: active
            ? token.colorPrimary
            : isBlank(line)
              ? token.colorTextQuaternary
              : token.colorText,
          fontWeight: active ? 600 : 400,
          borderLeft: `3px solid ${active ? token.colorPrimary : "transparent"}`,
        }
        return (
          <div
            key={index}
            ref={(element) => {
              rows.current[index] = element
            }}
            style={style}
            onClick={onSelect ? () => onSelect(index) : undefined}
          >
            {prefix ? (
              <span style={{ flex: "none", fontVariantNumeric: "tabular-nums" }}>
                {prefix(index)}
              </span>
            ) : null}
            <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>
              {isBlank(line) ? "" : line}
            </span>
          </div>
        )
      })}
    </div>
  )
}
