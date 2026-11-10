import { MoonOutlined, SunOutlined } from "@ant-design/icons"
import { useGetIdentity } from "@refinedev/core"
import { Avatar, Layout, Space, Switch, Typography, theme } from "antd"
import type { Identity } from "@/providers/authProvider"
import { useColorMode } from "@/theme/color-mode"

/** The bar above the pages: dark / light switch and who is logged in. */
export function AppHeader() {
  const { mode, toggle } = useColorMode()
  const { data: user } = useGetIdentity<Identity>()
  const { token } = theme.useToken()

  return (
    <Layout.Header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 16,
        padding: "0 24px",
        height: 64,
        position: "sticky",
        top: 0,
        zIndex: 10,
        background: token.colorBgElevated,
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      <Switch
        checked={mode === "dark"}
        onChange={toggle}
        checkedChildren={<MoonOutlined />}
        unCheckedChildren={<SunOutlined />}
        aria-label="Chế độ tối"
      />
      {user ? (
        <Space size="small">
          <Typography.Text strong ellipsis style={{ maxWidth: 160 }}>
            {user.name}
          </Typography.Text>
          <Avatar src={user.avatar ?? undefined}>{user.name.slice(0, 1).toUpperCase()}</Avatar>
        </Space>
      ) : null}
    </Layout.Header>
  )
}
