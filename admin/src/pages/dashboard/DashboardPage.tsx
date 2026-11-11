import { useGetIdentity } from "@refinedev/core"
import { Alert, Button, Card, Col, Row } from "antd"
import type { AdminStats, Page, TrackView } from "@/api/types"
import { useApi } from "@/hooks/useApi"
import { activityLine } from "@/lib/greeting"
import type { Identity } from "@/providers/authProvider"
import { DailyChart } from "./DashboardCharts"
import { DashboardHero } from "./DashboardHero"
import { StatStrip } from "./StatStrip"
import { TopTracks } from "./TopTracks"
import { TranslationQuota } from "./TranslationQuota"

/** How many covers the banner is made of. */
const BANNER_COVERS = 16

const lastOf = (series: { count: number }[]): number => series[series.length - 1]?.count ?? 0
const sumOfLast = (series: { count: number }[], days: number): number =>
  series.slice(-days).reduce((total, entry) => total + entry.count, 0)

const WEEK = 7

function leadOf(stats: AdminStats): string {
  return activityLine(
    { plays: lastOf(stats.playsByDay), newUsers: lastOf(stats.newUsersByDay) },
    { plays: sumOfLast(stats.playsByDay, WEEK), newUsers: sumOfLast(stats.newUsersByDay, WEEK) },
  )
}

export function DashboardPage() {
  const stats = useApi<AdminStats>("/admin/stats")
  // The tracks list is ordered by plays, so its first covers are the ones people hear most.
  const catalog = useApi<Page<TrackView>>("/tracks", { limit: BANNER_COVERS })
  const { data: me } = useGetIdentity<Identity>()
  const data = stats.data

  if (stats.error && !data) {
    return (
      <Alert
        type="error"
        showIcon
        message="Không tải được số liệu"
        description={stats.error.message}
        action={<Button onClick={stats.reload}>Thử lại</Button>}
      />
    )
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <DashboardHero
        name={me?.name}
        covers={(catalog.data?.items ?? []).map((track) => track.cover)}
        lead={data ? leadOf(data) : null}
      />

      <StatStrip stats={data} />

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          {data ? (
            <DailyChart
              title="Lượt nghe 14 ngày"
              series={data.playsByDay}
              unit="lượt nghe"
              kind="line"
            />
          ) : (
            <Card loading style={{ minHeight: 320 }} />
          )}
        </Col>
        <Col xs={24} xl={12}>
          {data ? (
            <DailyChart
              title="Người dùng mới 14 ngày"
              series={data.newUsersByDay}
              unit="người dùng"
              kind="bar"
            />
          ) : (
            <Card loading style={{ minHeight: 320 }} />
          )}
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          <Card title="Bài nghe nhiều nhất">
            <TopTracks tracks={data?.topTracks} />
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <TranslationQuota />
        </Col>
      </Row>
    </div>
  )
}
