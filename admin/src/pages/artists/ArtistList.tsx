import { DeleteButton, EditButton, List, ShowButton, useTable } from "@refinedev/antd"
import type { HttpError } from "@refinedev/core"
import {
  Alert,
  Avatar,
  Button,
  Empty,
  Form,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd"
import { Link } from "react-router"
import type { ArtistView, Region } from "@/api/types"
import { RegionTag } from "@/components/tags"
import { REGION_LABELS } from "@/lib/languages"
import { formatNumber } from "@/lib/time"

interface Search {
  q?: string
  region?: Region
}

const REGION_OPTIONS = Object.entries(REGION_LABELS).map(([value, label]) => ({ value, label }))

export function ArtistList() {
  const { tableProps, searchFormProps, tableQuery } = useTable<ArtistView, HttpError, Search>({
    resource: "artists",
    syncWithLocation: false,
    pagination: { pageSize: 20 },
    onSearch: ({ q, region }) => [
      { field: "q", operator: "contains", value: q?.trim() },
      { field: "region", operator: "eq", value: region },
    ],
  })
  const submitFilters = () => searchFormProps.form?.submit()

  return (
    <List title="Nghệ sĩ" createButtonProps={{ children: "Thêm nghệ sĩ" }}>
      <Form {...searchFormProps} layout="inline" style={{ marginBottom: 16, rowGap: 8 }}>
        <Form.Item name="q">
          <Input.Search
            allowClear
            placeholder="Tìm theo tên nghệ sĩ"
            style={{ width: 280 }}
            onSearch={submitFilters}
          />
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
          message="Không tải được danh sách nghệ sĩ"
          description={tableQuery.error.message}
          action={<Button onClick={() => void tableQuery.refetch()}>Thử lại</Button>}
        />
      ) : null}

      <Table<ArtistView>
        {...tableProps}
        rowKey="id"
        scroll={{ x: "max-content" }}
        locale={{ emptyText: <Empty description="Chưa có nghệ sĩ nào khớp" /> }}
      >
        <Table.Column
          title="Ảnh"
          dataIndex="image"
          width={72}
          render={(image: string, artist: ArtistView) => (
            <Avatar src={image} size={48}>
              {artist.name.slice(0, 1)}
            </Avatar>
          )}
        />
        <Table.Column<ArtistView>
          title="Nghệ sĩ"
          dataIndex="name"
          render={(name: string, artist) => (
            <Link to={`/artists/show/${artist.id}`}>
              <Typography.Text strong ellipsis style={{ maxWidth: 240 }}>
                {name}
              </Typography.Text>
            </Link>
          )}
        />
        <Table.Column<ArtistView>
          title="Khu vực"
          dataIndex="region"
          render={(region: Region) => <RegionTag region={region} />}
        />
        <Table.Column<ArtistView>
          title="Thể loại"
          dataIndex="genres"
          render={(genres: string[]) => (
            <Space size={[4, 4]} wrap>
              {genres.slice(0, 3).map((genre) => (
                <Tag key={genre}>{genre}</Tag>
              ))}
              {genres.length > 3 ? <Tag>+{genres.length - 3}</Tag> : null}
            </Space>
          )}
        />
        <Table.Column
          title="Người theo dõi"
          dataIndex="followers"
          align="right"
          render={(followers: number) => formatNumber(followers)}
        />
        <Table.Column<ArtistView>
          title="Thao tác"
          fixed="right"
          render={(_, artist) => (
            <Space>
              <ShowButton hideText size="small" recordItemId={artist.id} />
              <EditButton hideText size="small" recordItemId={artist.id} />
              <DeleteButton
                hideText
                size="small"
                recordItemId={artist.id}
                confirmTitle="Xoá nghệ sĩ này và toàn bộ bài hát, album của họ?"
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
