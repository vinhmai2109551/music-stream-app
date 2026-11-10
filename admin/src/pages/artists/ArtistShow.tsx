import { Show } from "@refinedev/antd"
import { useOne } from "@refinedev/core"
import {
  Alert,
  Avatar,
  Card,
  Descriptions,
  Empty,
  Skeleton,
  Space,
  Table,
  Tag,
  Typography,
} from "antd"
import { Link, useParams } from "react-router"
import type { ArtistView, Page, TrackView } from "@/api/types"
import { PlaybackTag, RegionTag } from "@/components/tags"
import { useApi } from "@/hooks/useApi"
import { formatDuration, formatNumber } from "@/lib/time"

/** The artist's tracks shown on the page (the API gives at most 100 per page). */
const TRACKS_SHOWN = 100

export function ArtistShow() {
  const { id = "" } = useParams()
  const { query, result: artist } = useOne<ArtistView>({ resource: "artists", id })
  const tracks = useApi<Page<TrackView>>("/tracks", { artistId: id, limit: TRACKS_SHOWN })

  return (
    <Show isLoading={query.isLoading} title="Chi tiết nghệ sĩ">
      {query.isError ? (
        <Alert
          type="error"
          showIcon
          message="Không tải được nghệ sĩ"
          description={query.error.message}
        />
      ) : !artist ? (
        <Skeleton active />
      ) : (
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Space align="start" size={16} wrap>
            <Avatar src={artist.image} size={120}>
              {artist.name.slice(0, 1)}
            </Avatar>
            <div>
              <Typography.Title level={4} style={{ marginTop: 0 }}>
                {artist.name}
              </Typography.Title>
              <Space wrap>
                <RegionTag region={artist.region} />
                {artist.genres.map((genre) => (
                  <Tag key={genre}>{genre}</Tag>
                ))}
              </Space>
            </div>
          </Space>

          <Descriptions bordered size="small" column={1}>
            <Descriptions.Item label="Người theo dõi">
              {formatNumber(artist.followers)}
            </Descriptions.Item>
            <Descriptions.Item label="Tiểu sử">{artist.bio || "—"}</Descriptions.Item>
          </Descriptions>

          <Card
            title={`Bài hát của nghệ sĩ${tracks.data ? ` (${tracks.data.total})` : ""}`}
            size="small"
          >
            {tracks.error && !tracks.data ? (
              <Alert type="error" showIcon message={tracks.error.message} />
            ) : (
              <Table<TrackView>
                size="small"
                rowKey="id"
                loading={tracks.loading}
                dataSource={tracks.data?.items ?? []}
                pagination={{ pageSize: 10, hideOnSinglePage: true }}
                scroll={{ x: "max-content" }}
                locale={{ emptyText: <Empty description="Nghệ sĩ này chưa có bài hát" /> }}
                columns={[
                  {
                    title: "Bài hát",
                    dataIndex: "title",
                    render: (title: string, track) => (
                      <Link to={`/tracks/show/${track.id}`}>{title}</Link>
                    ),
                  },
                  {
                    title: "Thời lượng",
                    dataIndex: "duration",
                    align: "right",
                    render: (seconds: number) => formatDuration(seconds),
                  },
                  {
                    title: "Lượt nghe",
                    dataIndex: "plays",
                    align: "right",
                    render: (plays: number) => formatNumber(plays),
                  },
                  { title: "Nguồn phát", render: (_, track) => <PlaybackTag track={track} /> },
                ]}
              />
            )}
          </Card>
        </Space>
      )}
    </Show>
  )
}
