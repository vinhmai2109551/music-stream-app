import { FileTextOutlined } from "@ant-design/icons"
import { DeleteButton, EditButton, List, ShowButton, useTable } from "@refinedev/antd"
import type { HttpError } from "@refinedev/core"
import { Alert, Button, Empty, Form, Image, Input, Select, Space, Table, Typography } from "antd"
import { Link } from "react-router"
import type { LyricsStatus, Region, TrackView } from "@/api/types"
import { ArtistSelect } from "@/components/RecordSelect"
import { LyricsTag, PlaybackTag } from "@/components/tags"
import { useApi } from "@/hooks/useApi"
import { REGION_LABELS } from "@/lib/languages"
import { formatDuration, formatNumber } from "@/lib/time"

interface Search {
  q?: string
  artistId?: string
  region?: Region
}

const REGION_OPTIONS = Object.entries(REGION_LABELS).map(([value, label]) => ({ value, label }))

export function TrackList() {
  const { tableProps, searchFormProps, tableQuery } = useTable<TrackView, HttpError, Search>({
    resource: "tracks",
    syncWithLocation: false,
    pagination: { pageSize: 20 },
    onSearch: ({ q, artistId, region }) => [
      { field: "q", operator: "contains", value: q?.trim() },
      { field: "artistId", operator: "eq", value: artistId },
      { field: "region", operator: "eq", value: region },
    ],
  })

  // One call for the whole page: which of these tracks have lyrics, and timed ones.
  const ids = (tableProps.dataSource ?? []).map((track) => track.id)
  const lyrics = useApi<Record<string, LyricsStatus>>(
    ids.length > 0 ? "/admin/tracks/lyrics-status" : null,
    { ids: ids.join(",") },
  )
  const submitFilters = () => searchFormProps.form?.submit()

  return (
    <List title="Bài hát" createButtonProps={{ children: "Thêm bài hát" }}>
      <Form {...searchFormProps} layout="inline" style={{ marginBottom: 16, rowGap: 8 }}>
        <Form.Item name="q">
          <Input.Search
            allowClear
            placeholder="Tìm theo tên bài hoặc nghệ sĩ"
            style={{ width: 280 }}
            onSearch={submitFilters}
          />
        </Form.Item>
        <Form.Item name="artistId" style={{ width: 220 }}>
          <ArtistSelect allowClear placeholder="Lọc theo nghệ sĩ" onChange={submitFilters} />
        </Form.Item>
        <Form.Item name="region">
          <Select
            allowClear
            placeholder="Lọc theo khu vực"
            options={REGION_OPTIONS}
            style={{ width: 180 }}
            onChange={submitFilters}
          />
        </Form.Item>
      </Form>

      {tableQuery.isError ? (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          message="Không tải được danh sách bài hát"
          description={tableQuery.error.message}
          action={<Button onClick={() => void tableQuery.refetch()}>Thử lại</Button>}
        />
      ) : null}

      <Table<TrackView>
        {...tableProps}
        rowKey="id"
        scroll={{ x: "max-content" }}
        locale={{ emptyText: <Empty description="Chưa có bài hát nào khớp" /> }}
      >
        <Table.Column
          title="Bìa"
          dataIndex="cover"
          width={72}
          render={(cover: string) => (
            <Image
              src={cover}
              width={48}
              height={48}
              alt=""
              style={{ objectFit: "cover", borderRadius: 6 }}
            />
          )}
        />
        <Table.Column<TrackView>
          title="Bài hát"
          dataIndex="title"
          render={(title: string, track) => (
            <Link to={`/tracks/show/${track.id}`}>
              <Typography.Text strong ellipsis style={{ maxWidth: 260 }}>
                {title}
              </Typography.Text>
            </Link>
          )}
        />
        <Table.Column title="Nghệ sĩ" dataIndex="artist" ellipsis />
        <Table.Column
          title="Thời lượng"
          dataIndex="duration"
          align="right"
          render={(seconds: number) => formatDuration(seconds)}
        />
        <Table.Column
          title="Lượt nghe"
          dataIndex="plays"
          align="right"
          render={(plays: number) => formatNumber(plays)}
        />
        <Table.Column<TrackView>
          title="Nguồn phát"
          render={(_, track) => <PlaybackTag track={track} />}
        />
        <Table.Column<TrackView>
          title="Lời"
          render={(_, track) => <LyricsTag status={lyrics.data?.[track.id]} />}
        />
        <Table.Column<TrackView>
          title="Thao tác"
          fixed="right"
          render={(_, track) => (
            <Space>
              <ShowButton hideText size="small" recordItemId={track.id} />
              <EditButton hideText size="small" recordItemId={track.id} />
              <Link to={`/tracks/${track.id}/lyrics`}>
                <Button size="small" icon={<FileTextOutlined />} aria-label="Sửa lời bài hát" />
              </Link>
              <DeleteButton
                hideText
                size="small"
                recordItemId={track.id}
                confirmTitle="Xoá bài hát này?"
                confirmOkText="Xoá"
                confirmCancelText="Huỷ"
              />
            </Space>
          )}
        />
      </Table>
    </List>
  )
}
