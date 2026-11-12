import { Skeleton } from "antd"
import type { AdminStats, DailyCount } from "@/api/types"
import { formatCompact, formatNumber } from "@/lib/time"
import { Sparkline } from "./Sparkline"

interface Cell {
  label: string
  value: number
  /** Show the number shortened (`25,5 tỷ`); the exact one is in the tooltip. */
  compact?: boolean
  /** The last days behind the number, drawn under it. */
  trend?: { series: DailyCount[]; label: string }
}

const sum = (series: DailyCount[]) => series.reduce((total, entry) => total + entry.count, 0)

function cellsOf({ totals, playsByDay, newUsersByDay }: AdminStats): Cell[] {
  return [
    { label: "Bài hát", value: totals.tracks },
    { label: "Nghệ sĩ", value: totals.artists },
    { label: "Album", value: totals.albums },
    {
      label: "Người dùng",
      value: totals.users,
      trend: {
        series: newUsersByDay,
        label: `Người dùng mới trong 14 ngày: ${sum(newUsersByDay)}`,
      },
    },
    { label: "Tổng lượt nghe", value: totals.plays, compact: true },
    {
      label: "Lượt nghe 7 ngày",
      value: totals.playsLast7Days,
      trend: { series: playsByDay, label: `Lượt nghe trong 14 ngày: ${sum(playsByDay)}` },
    },
  ]
}

const PLACEHOLDERS = [
  "Bài hát",
  "Nghệ sĩ",
  "Album",
  "Người dùng",
  "Tổng lượt nghe",
  "Lượt nghe 7 ngày",
]

/**
 * The totals as one strip instead of six cards: they belong together, and the two that have a
 * recent history show it as a small line under the number.
 */
export function StatStrip({ stats }: { stats: AdminStats | undefined }) {
  if (!stats) {
    return (
      <div className="statstrip" aria-busy="true">
        {PLACEHOLDERS.map((label) => (
          <div key={label} className="statstrip__cell">
            <span className="statstrip__label">{label}</span>
            <Skeleton.Input active size="small" style={{ width: 90 }} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="statstrip">
      {cellsOf(stats).map((cell) => (
        <div key={cell.label} className="statstrip__cell" title={formatNumber(cell.value)}>
          <span className="statstrip__label">{cell.label}</span>
          <span className="statstrip__value">
            {cell.compact ? formatCompact(cell.value) : formatNumber(cell.value)}
          </span>
          {cell.trend ? (
            <span className="statstrip__foot">
              <Sparkline
                values={cell.trend.series.map((entry) => entry.count)}
                label={cell.trend.label}
              />
            </span>
          ) : null}
        </div>
      ))}
    </div>
  )
}
