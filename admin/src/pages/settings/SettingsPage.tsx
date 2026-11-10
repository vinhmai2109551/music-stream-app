import { LogoutOutlined } from "@ant-design/icons"
import { useGetIdentity, useLogout } from "@refinedev/core"
import { Button, Card, Descriptions, Switch, Typography } from "antd"
import { API_URL } from "@/config/env"
import type { Identity } from "@/providers/authProvider"
import { useColorMode } from "@/theme/color-mode"
import { TranslationQuota } from "../dashboard/TranslationQuota"

export function SettingsPage() {
  const { data: me } = useGetIdentity<Identity>()
  const { mutate: logout, isPending } = useLogout()
  const { mode, toggle } = useColorMode()

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 720 }}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        Cài đặt
      </Typography.Title>

      <Card title="Tài khoản">
        <Descriptions column={1} size="small">
          <Descriptions.Item label="Tên">{me?.name ?? "—"}</Descriptions.Item>
          <Descriptions.Item label="Email">{me?.email ?? "—"}</Descriptions.Item>
        </Descriptions>
        <Button icon={<LogoutOutlined />} loading={isPending} onClick={() => logout()}>
          Đăng xuất
        </Button>
      </Card>

      <Card title="Giao diện">
        <label style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Switch checked={mode === "dark"} onChange={toggle} />
          <span>Chế độ tối</span>
        </label>
      </Card>

      <Card title="Máy chủ">
        <Descriptions column={1} size="small">
          <Descriptions.Item label="Địa chỉ API">{API_URL}</Descriptions.Item>
          <Descriptions.Item label="Tài liệu API">
            <a href={`${API_URL}/docs`} target="_blank" rel="noreferrer">
              Mở Swagger
            </a>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <TranslationQuota />
    </div>
  )
}
