import type { RefineLayoutThemedTitleProps } from "@refinedev/antd"
import { useState } from "react"
import { Link } from "react-router"
import { Logo } from "./Logo"

/** The top of the side menu: the mark, and the name when the menu is open. */
export function AppTitle({ collapsed }: RefineLayoutThemedTitleProps) {
  const [hover, setHover] = useState(false)
  return (
    <Link
      to="/"
      className="brand"
      aria-label="Music Stream Admin, về trang chủ"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
    >
      <Logo size={34} live={hover} />
      {collapsed ? null : (
        <span className="brand__text">
          <strong>Music Stream</strong>
          <span>Quản trị</span>
        </span>
      )}
    </Link>
  )
}
