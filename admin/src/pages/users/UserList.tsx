import { DeleteButton, List, useTable } from "@refinedev/antd"
import { useGetIdentity, useUpdate, type HttpError } from "@refinedev/core"
import {
  Alert,
  Avatar,
  Button,
  Empty,
  Form,
  Input,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd"
import dayjs from "dayjs"
import type { AdminUser, Role } from "@/api/types"
import type { Identity } from "@/providers/authProvider"

interface Search {
  q?: string
  role?: Role
  banned?: boolean
}

const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Quản trị viên" },
  { value: "USER", label: "Người dùng" },
]

const STATUS_OPTIONS = [
  { value: false, label: "Đang hoạt động" },
  { value: true, label: "Đã bị khoá" },
]

export function UserList() {
  const { tableProps, searchFormProps, tableQuery } = useTable<AdminUser, HttpError, Search>({
    resource: "users",
    syncWithLocation: false,
    pagination: { pageSize: 20 },
    onSearch: ({ q, role, banned }) => [
      { field: "q", operator: "contains", value: q?.trim() },
      { field: "role", operator: "eq", value: role },
      { field: "banned", operator: "eq", value: banned },
    ],
  })
  const { data: me } = useGetIdentity<Identity>()
  const { mutate: update, mutation } = useUpdate<AdminUser, HttpError, Partial<AdminUser>>()
  const pendingId = mutation.isPending ? (mutation.variables?.id ?? null) : null
  const submitFilters = () => searchFormProps.form?.submit()

  const change = (user: AdminUser, values: Partial<AdminUser>, message: string) =>
    update({
      resource: "users",
      id: user.id,
      values,
      successNotification: () => ({ type: "success", message }),
    })

  return (
    <List title="Người dùng" canCreate={false}>
      <Form {...searchFormProps} layout="inline" style={{ marginBottom: 16, rowGap: 8 }}>
        <Form.Item name="q">
          <Input.Search
            allowClear
            placeholder="Tìm theo email hoặc tên"
            style={{ width: 280 }}
            onSearch={submitFilters}
          />
        </Form.Item>
        <Form.Item name="role">
          <Select
            allowClear
            placeholder="Vai trò"
            options={ROLE_OPTIONS}
            style={{ width: 160 }}
            onChange={submitFilters}
          />
        </Form.Item>
        <Form.Item name="banned">
          <Select
            allowClear
            placeholder="Trạng thái"
            options={STATUS_OPTIONS}
            style={{ width: 170 }}
            onChange={submitFilters}
          />
        </Form.Item>
      </Form>

      {tableQuery.isError ? (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          message="Không tải được danh sách người dùng"
          description={tableQuery.error.message}
          action={<Button onClick={() => void tableQuery.refetch()}>Thử lại</Button>}
        />
      ) : null}

      <Table<AdminUser>
        {...tableProps}
        rowKey="id"
        scroll={{ x: "max-content" }}
        locale={{ emptyText: <Empty description="Không có người dùng nào khớp" /> }}
      >
        <Table.Column
          title="Ảnh"
          dataIndex="avatarUrl"
          width={72}
          render={(url: string | null, user: AdminUser) => (
            <Avatar src={url ?? undefined}>{user.name.slice(0, 1).toUpperCase()}</Avatar>
          )}
        />
        <Table.Column<AdminUser>
          title="Email"
          dataIndex="email"
          render={(email: string) => (
            <Typography.Text ellipsis style={{ maxWidth: 240 }}>
              {email}
            </Typography.Text>
          )}
        />
        <Table.Column title="Tên" dataIndex="name" ellipsis />
        <Table.Column
          title="Vai trò"
          dataIndex="role"
          render={(role: Role) =>
            role === "ADMIN" ? <Tag color="purple">Quản trị viên</Tag> : <Tag>Người dùng</Tag>
          }
        />
        <Table.Column
          title="Premium"
          dataIndex="isPremium"
          render={(premium: boolean) =>
            premium ? <Tag color="gold">Premium</Tag> : <Tag>Miễn phí</Tag>
          }
        />
        <Table.Column
          title="Trạng thái"
          dataIndex="isBanned"
          render={(banned: boolean) =>
            banned ? <Tag color="red">Đã bị khoá</Tag> : <Tag color="green">Hoạt động</Tag>
          }
        />
        <Table.Column
          title="Ngày tạo"
          dataIndex="createdAt"
          render={(createdAt: string) => dayjs(createdAt).format("DD/MM/YYYY HH:mm")}
        />
        <Table.Column<AdminUser>
          title="Thao tác"
          fixed="right"
          render={(_, user) =>
            // An admin cannot lock themselves out: no actions on their own row.
            user.id === me?.id ? (
              <Typography.Text type="secondary">Tài khoản của bạn</Typography.Text>
            ) : (
              <Space wrap>
                <Popconfirm
                  title={user.isBanned ? "Mở khoá tài khoản này?" : "Khoá tài khoản này?"}
                  description={
                    user.isBanned
                      ? "Người dùng sẽ đăng nhập lại được."
                      : "Người dùng bị đăng xuất khỏi mọi thiết bị và không đăng nhập được nữa."
                  }
                  okText={user.isBanned ? "Mở khoá" : "Khoá"}
                  cancelText="Huỷ"
                  okButtonProps={{ danger: !user.isBanned }}
                  onConfirm={() =>
                    change(
                      user,
                      { isBanned: !user.isBanned },
                      user.isBanned ? "Đã mở khoá tài khoản" : "Đã khoá tài khoản",
                    )
                  }
                >
                  <Button size="small" danger={!user.isBanned} loading={pendingId === user.id}>
                    {user.isBanned ? "Mở khoá" : "Khoá"}
                  </Button>
                </Popconfirm>
                <Popconfirm
                  title={
                    user.role === "ADMIN"
                      ? "Hạ xuống người dùng thường?"
                      : "Cấp quyền quản trị viên?"
                  }
                  description={
                    user.role === "ADMIN"
                      ? "Tài khoản này sẽ mất quyền vào trang quản trị."
                      : "Tài khoản này sẽ quản lý được toàn bộ nội dung và người dùng."
                  }
                  okText="Xác nhận"
                  cancelText="Huỷ"
                  onConfirm={() =>
                    change(
                      user,
                      { role: user.role === "ADMIN" ? "USER" : "ADMIN" },
                      "Đã đổi vai trò",
                    )
                  }
                >
                  <Button size="small" loading={pendingId === user.id}>
                    {user.role === "ADMIN" ? "Hạ quyền" : "Cấp admin"}
                  </Button>
                </Popconfirm>
                <DeleteButton
                  hideText
                  size="small"
                  recordItemId={user.id}
                  resource="users"
                  confirmTitle="Xoá vĩnh viễn tài khoản này cùng mọi dữ liệu của họ?"
                  confirmOkText="Xoá"
                  confirmCancelText="Huỷ"
                />
              </Space>
            )
          }
        />
      </Table>
    </List>
  )
}
