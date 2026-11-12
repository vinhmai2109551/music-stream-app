import { MoonOutlined, SunOutlined } from "@ant-design/icons"
import { useGetIdentity } from "@refinedev/core"
import { Avatar, Layout, Switch, Typography } from "antd"
import type { Identity } from "@/providers/authProvider"
import { useColorMode } from "@/theme/color-mode"

/** The bar above the pages: frosted, so the page scrolls under it; mode switch and who is in. */
export function AppHeader() {
  const { mode, toggle } = useColorMode()
  const { data: user } = useGetIdentity<Identity>()

  return (
    <Layout.Header className="appbar">
      <Switch
        checked={mode === "dark"}
        onChange={toggle}
        checkedChildren={<MoonOutlined />}
        unCheckedChildren={<SunOutlined />}
        aria-label="Chế độ tối"
      />
      {user ? (
        <div className="appbar__user">
          <Typography.Text strong ellipsis className="appbar__name">
            {user.name}
          </Typography.Text>
          <Avatar alt="" src={user.avatar ?? undefined}>
            {user.name.slice(0, 1).toUpperCase()}
          </Avatar>
        </div>
      ) : null}
    </Layout.Header>
  )
}
