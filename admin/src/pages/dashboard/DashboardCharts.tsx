import { Card, Empty, theme } from "antd"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { DailyCount } from "@/api/types"

const CHART_HEIGHT = 260

/** `2026-11-10` -> `10/11` */
const shortDay = (day: string): string => `${day.slice(8, 10)}/${day.slice(5, 7)}`

interface Props {
  title: string
  series: DailyCount[]
  /** What one count is, for the tooltip ("lượt nghe", "người dùng"). */
  unit: string
  kind: "line" | "bar"
}

/** One 14-day chart in a card; coloured from the Ant Design theme so it follows dark / light. */
export function DailyChart({ title, series, unit, kind }: Props) {
  const { token } = theme.useToken()
  const empty = series.every((entry) => entry.count === 0)

  const axis = { stroke: token.colorTextTertiary, fontSize: 12 }
  const common = (
    <>
      <CartesianGrid stroke={token.colorBorderSecondary} strokeDasharray="3 3" vertical={false} />
      <XAxis dataKey="day" tickFormatter={shortDay} tickLine={false} {...axis} />
      <YAxis allowDecimals={false} width={32} tickLine={false} axisLine={false} {...axis} />
      <Tooltip
        labelFormatter={(day) => `Ngày ${shortDay(String(day))}`}
        formatter={(value) => [String(value), unit]}
        contentStyle={{
          background: token.colorBgElevated,
          border: `1px solid ${token.colorBorderSecondary}`,
          borderRadius: token.borderRadius,
          color: token.colorText,
        }}
      />
    </>
  )

  return (
    <Card title={title} styles={{ body: { padding: 16 } }}>
      {empty ? (
        <Empty
          style={{ height: CHART_HEIGHT, display: "grid", placeContent: "center" }}
          description="Chưa có dữ liệu trong 14 ngày qua"
        />
      ) : (
        <div role="img" aria-label={`${title}: biểu đồ 14 ngày gần nhất`}>
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            {kind === "line" ? (
              <LineChart data={series}>
                {common}
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke={token.colorPrimary}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  isAnimationActive={false}
                />
              </LineChart>
            ) : (
              <BarChart data={series}>
                {common}
                <Bar
                  dataKey="count"
                  fill={token.colorPrimary}
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
