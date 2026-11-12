import { DeleteButton, List, useTable } from "@refinedev/antd"
import type { HttpError } from "@refinedev/core"
import { Alert, Button, Empty, Image, Space, Table, Typography } from "antd"
import dayjs from "dayjs"
import type { FeedPostView } from "@/api/types"
import { formatNumber } from "@/lib/time"

export function FeedList() {
  const { tableProps, tableQuery } = useTable<FeedPostView, HttpError>({
    resource: "feed",
    syncWithLocation: false,
    pagination: { pageSize: 20 },
  })

  return (
    <List title="Feed" createButtonProps={{ children: "Đăng bài mới" }}>
      {tableQuery.isError ? (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          message="Không tải được feed"
          description={tableQuery.error.message}
          action={<Button onClick={() => void tableQuery.refetch()}>Thử lại</Button>}
        />
      ) : null}

      <Table<FeedPostView>
        {...tableProps}
        rowKey="id"
        scroll={{ x: "max-content" }}
        locale={{ emptyText: <Empty description="Chưa có bài đăng nào" /> }}
      >
        <Table.Column
          title="Ảnh"
          dataIndex="artwork"
          width={72}
          render={(artwork: string) => (
            <Image
              src={artwork}
              width={48}
              height={48}
              alt=""
              style={{ objectFit: "cover", borderRadius: 6 }}
            />
          )}
        />
        <Table.Column<FeedPostView>
          title="Nghệ sĩ"
          render={(_, post) =>
            post.artist?.name ?? <Typography.Text type="secondary">Đã xoá</Typography.Text>
          }
        />
        <Table.Column<FeedPostView>
          title="Bài hát"
          render={(_, post) =>
            post.track?.title ?? <Typography.Text type="secondary">Đã xoá</Typography.Text>
          }
        />
        <Table.Column<FeedPostView>
          title="Nội dung"
          dataIndex="caption"
          render={(caption: string) => (
            <Typography.Paragraph ellipsis={{ rows: 2 }} style={{ maxWidth: 320, marginBottom: 0 }}>
              {caption || "—"}
            </Typography.Paragraph>
          )}
        />
        <Table.Column
          title="Tương tác"
          render={(_, post: FeedPostView) => (
            <Space size="small">
              <span>{formatNumber(post.likesCount)} thích</span>
              <span>{formatNumber(post.commentsCount)} bình luận</span>
            </Space>
          )}
        />
        <Table.Column
          title="Đăng lúc"
          dataIndex="createdAt"
          render={(createdAt: string) => dayjs(createdAt).format("DD/MM/YYYY HH:mm")}
        />
        <Table.Column<FeedPostView>
          title="Thao tác"
          fixed="right"
          render={(_, post) => (
            <DeleteButton
              hideText
              title="Xoá"
              aria-label="Xoá"
              size="small"
              recordItemId={post.id}
              confirmTitle="Xoá bài đăng này cùng bình luận của nó?"
              confirmOkText="Xoá"
              confirmCancelText="Huỷ"
            />
          )}
        />
      </Table>
    </List>
  )
}
