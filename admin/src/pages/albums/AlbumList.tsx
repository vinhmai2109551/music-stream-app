import { DeleteButton, EditButton, List, ShowButton, useTable } from "@refinedev/antd"
import type { HttpError } from "@refinedev/core"
import { Alert, Button, Empty, Form, Image, Input, Space, Table, Typography } from "antd"
import { Link } from "react-router"
import type { AlbumView } from "@/api/types"
import { ArtistSelect } from "@/components/RecordSelect"
import { formatNumber } from "@/lib/time"

interface Search {
  q?: string
  artistId?: string
}

export function AlbumList() {
  const { tableProps, searchFormProps, tableQuery } = useTable<AlbumView, HttpError, Search>({
    resource: "albums",
    syncWithLocation: false,
    pagination: { pageSize: 20 },
    onSearch: ({ q, artistId }) => [
      { field: "q", operator: "contains", value: q?.trim() },
      { field: "artistId", operator: "eq", value: artistId },
    ],
  })
  const submitFilters = () => searchFormProps.form?.submit()

  return (
    <List title="Album" createButtonProps={{ children: "Thêm album" }}>
      <Form {...searchFormProps} layout="inline" style={{ marginBottom: 16, rowGap: 8 }}>
        <Form.Item name="q">
          <Input.Search
            allowClear
            placeholder="Tìm theo tên album"
            style={{ width: 280 }}
            onSearch={submitFilters}
          />
        </Form.Item>
        <Form.Item name="artistId" style={{ width: 220 }}>
          <ArtistSelect allowClear placeholder="Lọc theo nghệ sĩ" onChange={submitFilters} />
        </Form.Item>
      </Form>

      {tableQuery.isError ? (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          message="Không tải được danh sách album"
          description={tableQuery.error.message}
          action={<Button onClick={() => void tableQuery.refetch()}>Thử lại</Button>}
        />
      ) : null}

      <Table<AlbumView>
        {...tableProps}
        rowKey="id"
        scroll={{ x: "max-content" }}
        locale={{ emptyText: <Empty description="Chưa có album nào khớp" /> }}
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
        <Table.Column<AlbumView>
          title="Album"
          dataIndex="title"
          render={(title: string, album) => (
            <Link to={`/albums/show/${album.id}`}>
              <Typography.Text strong ellipsis style={{ maxWidth: 260 }}>
                {title}
              </Typography.Text>
            </Link>
          )}
        />
        <Table.Column title="Nghệ sĩ" dataIndex="artist" ellipsis />
        <Table.Column<AlbumView>
          title="Số bài"
          align="right"
          render={(_, album) => formatNumber(album.trackIds.length)}
        />
        <Table.Column
          title="Lượt thích"
          dataIndex="likesCount"
          align="right"
          render={(likes: number) => formatNumber(likes)}
        />
        <Table.Column<AlbumView>
          title="Thao tác"
          fixed="right"
          render={(_, album) => (
            <Space>
              <ShowButton
                hideText
                size="small"
                title="Xem"
                aria-label="Xem"
                recordItemId={album.id}
              />
              <EditButton
                hideText
                size="small"
                title="Sửa"
                aria-label="Sửa"
                recordItemId={album.id}
              />
              <DeleteButton
                hideText
                title="Xoá"
                aria-label="Xoá"
                size="small"
                recordItemId={album.id}
                confirmTitle="Xoá album này? (các bài hát vẫn được giữ)"
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
