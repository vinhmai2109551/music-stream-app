import { CustomerServiceOutlined } from "@ant-design/icons"
import { Show } from "@refinedev/antd"
import { useOne } from "@refinedev/core"
import { Alert, Button, Descriptions, Image, Skeleton, Space, Tag, Typography } from "antd"
import { Link, useParams } from "react-router"
import type { TrackView } from "@/api/types"
import { LyricsTag, PlaybackTag } from "@/components/tags"
import { useApi } from "@/hooks/useApi"
import { lyricsLanguageLabel } from "@/lib/languages"
import { formatDuration, formatNumber } from "@/lib/time"
import { youtubeEmbedUrl } from "@/lib/youtube"
import type { LyricsStatus } from "@/api/types"

const TagList = ({ items }: { items: string[] }) =>
  items.length === 0 ? (
    <Typography.Text type="secondary">—</Typography.Text>
  ) : (
    <Space size={[4, 4]} wrap>
      {items.map((item) => (
        <Tag key={item}>{item}</Tag>
      ))}
    </Space>
  )

export function TrackShow() {
  const { id = "" } = useParams()
  const { query, result: track } = useOne<TrackView>({ resource: "tracks", id })
  const status = useApi<Record<string, LyricsStatus>>("/admin/tracks/lyrics-status", { ids: id })

  return (
    <Show
      isLoading={query.isLoading}
      title="Chi tiết bài hát"
      headerButtons={({ defaultButtons }) => (
        <>
          {defaultButtons}
          <Link to={`/tracks/${id}/lyrics`}>
            <Button icon={<CustomerServiceOutlined />}>Lời bài hát</Button>
          </Link>
        </>
      )}
    >
      {query.isError ? (
        <Alert
          type="error"
          showIcon
          message="Không tải được bài hát"
          description={query.error.message}
        />
      ) : !track ? (
        <Skeleton active />
      ) : (
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Space align="start" size={16} wrap>
            <Image
              src={track.cover}
              width={160}
              height={160}
              alt=""
              style={{ objectFit: "cover", borderRadius: 8 }}
            />
            <div>
              <Typography.Title level={4} style={{ marginTop: 0 }}>
                {track.title}
              </Typography.Title>
              <Typography.Text type="secondary">{track.artist}</Typography.Text>
              <div style={{ marginTop: 8 }}>
                <Space wrap>
                  <PlaybackTag track={track} />
                  <LyricsTag status={status.data?.[track.id]} />
                </Space>
              </div>
            </div>
          </Space>

          <Descriptions bordered size="small" column={{ xs: 1, md: 2 }}>
            <Descriptions.Item label="Thời lượng">
              {formatDuration(track.duration)}
            </Descriptions.Item>
            <Descriptions.Item label="Lượt nghe">{formatNumber(track.plays)}</Descriptions.Item>
            <Descriptions.Item label="Lượt thích">
              {formatNumber(track.likesCount)}
            </Descriptions.Item>
            <Descriptions.Item label="Ngôn ngữ">
              {track.language ? lyricsLanguageLabel(track.language) : "Không lời / chưa rõ"}
            </Descriptions.Item>
            <Descriptions.Item label="Thể loại" span={2}>
              <TagList items={track.genres} />
            </Descriptions.Item>
            <Descriptions.Item label="Tâm trạng" span={2}>
              <TagList items={track.mood} />
            </Descriptions.Item>
            <Descriptions.Item label="Thẻ" span={2}>
              <TagList items={track.tags} />
            </Descriptions.Item>
            <Descriptions.Item label="Mô tả" span={2}>
              {track.description || "—"}
            </Descriptions.Item>
          </Descriptions>

          {track.youtubeVideoId ? (
            <iframe
              title="Video YouTube"
              src={youtubeEmbedUrl(track.youtubeVideoId)}
              allow="encrypted-media; picture-in-picture"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              style={{ width: "100%", maxWidth: 560, aspectRatio: "16 / 9", border: 0 }}
            />
          ) : track.audioUrl ? (
            <audio
              controls
              preload="metadata"
              src={track.audioUrl}
              style={{ width: "100%", maxWidth: 560 }}
            />
          ) : null}
        </Space>
      )}
    </Show>
  )
}
