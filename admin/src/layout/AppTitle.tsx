import { CustomerServiceOutlined } from "@ant-design/icons"
import { ThemedTitle } from "@refinedev/antd"
import type { RefineLayoutThemedTitleProps } from "@refinedev/antd"

export function AppTitle({ collapsed }: RefineLayoutThemedTitleProps) {
  return (
    <ThemedTitle
      collapsed={collapsed}
      icon={<CustomerServiceOutlined />}
      text="Music Stream Admin"
    />
  )
}
