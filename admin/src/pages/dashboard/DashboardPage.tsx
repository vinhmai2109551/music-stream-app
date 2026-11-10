import {
  AppstoreOutlined,
  CustomerServiceOutlined,
  PlayCircleOutlined,
  ThunderboltOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons"
import { Alert, Button, Card, Col, Empty, Image, Row, Skeleton, Statistic, Table } from "antd"
import type { ReactNode } from "react"
import type { AdminStats } from "@/api/types"
import { useApi } from "@/hooks/useApi"
import { formatNumber } from "@/lib/time"
import { DailyChart } from "./DashboardCharts"
import { TranslationQuota } from "./TranslationQuota"

function Kpi({ title, value, icon }: { title: string; value: number; icon: ReactNode }) {
  return (
    <Card size="small">
      <Statistic title={title} value={formatNumber(value)} prefix={icon} />
    </Card>
  )
}

function KpiSkeletons() {
  return (
    <Row gutter={[16, 16]}>
      {Array.from({ length: 6 }, (_, index) => (
        <Col key={index} xs={12} md={8} xl={4}>
          <Card size="small">
            <Skeleton active paragraph={false} title={{ width: "70%" }} />
            <Skeleton.Input active size="small" />
          </Card>
        </Col>
      ))}
    </Row>
  )
}

export function DashboardPage() {
  const stats = useApi<AdminStats>("/admin/stats")
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
      {!data ? (
        <KpiSkeletons />
      ) : (
        <Row gutter={[16, 16]}>
          <Col xs={12} md={8} xl={4}>
            <Kpi title="Bài hát" value={data.totals.tracks} icon={<CustomerServiceOutlined />} />
          </Col>
          <Col xs={12} md={8} xl={4}>
            <Kpi title="Nghệ sĩ" value={data.totals.artists} icon={<UserOutlined />} />
          </Col>
          <Col xs={12} md={8} xl={4}>
            <Kpi title="Album" value={data.totals.albums} icon={<AppstoreOutlined />} />
          </Col>
          <Col xs={12} md={8} xl={4}>
            <Kpi title="Người dùng" value={data.totals.users} icon={<TeamOutlined />} />
          </Col>
          <Col xs={12} md={8} xl={4}>
            <Kpi title="Tổng lượt nghe" value={data.totals.plays} icon={<PlayCircleOutlined />} />
          </Col>
          <Col xs={12} md={8} xl={4}>
            <Kpi
              title="Lượt nghe 7 ngày"
              value={data.totals.playsLast7Days}
              icon={<ThunderboltOutlined />}
            />
          </Col>
        </Row>
      )}

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
          <Card title="Top 5 bài nghe nhiều nhất">
            {!data ? (
              <Skeleton active />
            ) : data.topTracks.length === 0 ? (
              <Empty description="Chưa có bài hát nào" />
            ) : (
              <Table
                size="small"
                rowKey="id"
                pagination={false}
                dataSource={data.topTracks}
                scroll={{ x: "max-content" }}
                columns={[
                  {
                    title: "Bìa",
                    dataIndex: "coverUrl",
                    width: 72,
                    render: (url: string) => (
                      <Image
                        src={url}
                        width={40}
                        height={40}
                        alt=""
                        style={{ objectFit: "cover" }}
                      />
                    ),
                  },
                  { title: "Bài hát", dataIndex: "title", ellipsis: true },
                  { title: "Nghệ sĩ", dataIndex: "artist", ellipsis: true },
                  {
                    title: "Lượt nghe",
                    dataIndex: "plays",
                    align: "right",
                    render: (plays: number) => formatNumber(plays),
                  },
                ]}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <TranslationQuota />
        </Col>
      </Row>
    </div>
  )
}
