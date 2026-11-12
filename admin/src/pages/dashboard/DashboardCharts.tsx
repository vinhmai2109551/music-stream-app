import { Card, Empty, theme } from "antd"
import { useId } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { DailyCount } from "@/api/types"
import { CHART_COLORS } from "@/theme/brand"
import { useColorMode } from "@/theme/color-mode"

const CHART_HEIGHT = 240

/** `2026-11-10` -> `10/11` */
const shortDay = (day: string): string => `${day.slice(8, 10)}/${day.slice(5, 7)}`

interface Props {
  title: string
  series: DailyCount[]
  /** What one count is, for the tooltip ("lượt nghe", "người dùng"). */
  unit: string
  kind: "line" | "bar"
}

/**
 * One 14-day chart. One series, so no legend (the title names it); thin marks, a quiet grid, and a
 * tooltip that follows the pointer. The colours are the validated pair of `CHART_COLORS`.
 */
export function DailyChart({ title, series, unit, kind }: Props) {
  const { token } = theme.useToken()
  const { mode } = useColorMode()
  const fillId = useId()
  const colors = CHART_COLORS[mode]
  const color = kind === "line" ? colors.line : colors.bars
  const empty = series.every((entry) => entry.count === 0)

  const axis = { stroke: token.colorTextTertiary, fontSize: 12 }
  const shared = (
    <>
      <CartesianGrid stroke={token.colorBorderSecondary} vertical={false} />
      <XAxis
        dataKey="day"
        tickFormatter={shortDay}
        tickLine={false}
        axisLine={false}
        interval="preserveStartEnd"
        minTickGap={18}
        {...axis}
      />
      <YAxis allowDecimals={false} width={32} tickLine={false} axisLine={false} {...axis} />
      <Tooltip
        cursor={
          kind === "line" ? { stroke: token.colorBorder } : { fill: token.colorFillQuaternary }
        }
        labelFormatter={(day) => `Ngày ${shortDay(String(day))}`}
        formatter={(value) => [String(value), unit]}
        contentStyle={{
          background: token.colorBgElevated,
          border: `1px solid ${token.colorBorderSecondary}`,
          borderRadius: token.borderRadius,
          color: token.colorText,
          boxShadow: token.boxShadowSecondary,
        }}
      />
    </>
  )

  return (
    <Card title={title} styles={{ body: { padding: "8px 16px 16px" } }}>
      {empty ? (
        <Empty
          style={{ height: CHART_HEIGHT, display: "grid", placeContent: "center" }}
          description="Chưa có dữ liệu trong 14 ngày qua"
        />
      ) : (
        <div role="img" aria-label={`${title}: biểu đồ 14 ngày gần nhất`}>
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            {kind === "line" ? (
              <AreaChart data={series}>
                <defs>
                  <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={color} stopOpacity={0.24} />
                    <stop offset="1" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                {shared}
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke={color}
                  strokeWidth={2}
                  fill={`url(#${fillId})`}
                  dot={false}
                  activeDot={{ r: 5, stroke: token.colorBgContainer, strokeWidth: 2, fill: color }}
                  isAnimationActive={false}
                />
              </AreaChart>
            ) : (
              <BarChart data={series}>
                {shared}
                <Bar
                  dataKey="count"
                  fill={color}
                  maxBarSize={18}
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}
