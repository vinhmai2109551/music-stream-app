import { Show } from "@refinedev/antd"
import { useOne } from "@refinedev/core"
import { Alert, Descriptions, Empty, Image, Skeleton, Space, Table, Typography } from "antd"
import { Link, useParams } from "react-router"
import type { AlbumDetail, TrackView } from "@/api/types"
import { PlaybackTag } from "@/components/tags"
import { formatDuration, formatNumber } from "@/lib/time"

export function AlbumShow() {
  const { id = "" } = useParams()
  const { query, result: album } = useOne<AlbumDetail>({ resource: "albums", id })

  return (
    <Show isLoading={query.isLoading} title="Chi tiết album">
      {query.isError ? (
        <Alert
          type="error"
          showIcon
          message="Không tải được album"
          description={query.error.message}
        />
      ) : !album ? (
        <Skeleton active />
      ) : (
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Space align="start" size={16} wrap>
            <Image
              src={album.cover}
              width={160}
              height={160}
              alt=""
              style={{ objectFit: "cover", borderRadius: 8 }}
            />
            <div>
              <Typography.Title level={4} style={{ marginTop: 0 }}>
                {album.title}
              </Typography.Title>
              <Typography.Text type="secondary">{album.artist}</Typography.Text>
            </div>
          </Space>
          <Descriptions bordered size="small" column={{ xs: 1, md: 2 }}>
            <Descriptions.Item label="Số bài">{album.tracks.length}</Descriptions.Item>
            <Descriptions.Item label="Lượt thích">
              {formatNumber(album.likesCount)}
            </Descriptions.Item>
          </Descriptions>
          <Table<TrackView>
            size="small"
            rowKey="id"
            pagination={false}
            dataSource={album.tracks}
            scroll={{ x: "max-content" }}
            locale={{ emptyText: <Empty description="Album chưa có bài hát nào" /> }}
            columns={[
              { title: "#", width: 56, render: (_, __, index) => index + 1 },
              {
                title: "Bài hát",
                dataIndex: "title",
                render: (title: string, track) => (
                  <Link to={`/tracks/show/${track.id}`}>{title}</Link>
                ),
              },
              { title: "Nghệ sĩ", dataIndex: "artist" },
              {
                title: "Thời lượng",
                dataIndex: "duration",
                align: "right",
                render: (seconds: number) => formatDuration(seconds),
              },
              { title: "Nguồn phát", render: (_, track) => <PlaybackTag track={track} /> },
            ]}
          />
        </Space>
      )}
    </Show>
  )
}
