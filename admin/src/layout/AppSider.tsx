import { ThemedSider, type RefineThemedLayoutSiderProps } from "@refinedev/antd"
import { ConfigProvider } from "antd"
import { useEffect, useRef } from "react"
import { SIDER_THEME } from "@/theme/antdTheme"
import { AppTitle } from "./AppTitle"

/**
 * Refine draws the collapse button without a name and the menu without a landmark. They are not
 * ours to edit, so the two attributes are put on them here, and again whenever Refine redraws.
 */
function useSiderAccessibility(root: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const element = root.current
    if (!element) return
    const apply = () => {
      element
        .querySelector(".ant-layout-sider-trigger button")
        ?.setAttribute("aria-label", "Thu gọn hoặc mở rộng menu")
      const menu = element.querySelector(".ant-layout-sider-children")
      menu?.setAttribute("role", "navigation")
      menu?.setAttribute("aria-label", "Menu chính")
    }
    apply()
    const observer = new MutationObserver(apply)
    observer.observe(element, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [root])
}

/** Refine's side menu inside a dark theme, so it stays dark when the page is light. */
export function AppSider(props: RefineThemedLayoutSiderProps) {
  const root = useRef<HTMLDivElement>(null)
  useSiderAccessibility(root)
  return (
    // `display: contents` keeps this wrapper out of the layout: the sider stays a child of the page.
    <div ref={root} style={{ display: "contents" }}>
      <ConfigProvider theme={SIDER_THEME}>
        <ThemedSider {...props} Title={AppTitle} />
      </ConfigProvider>
    </div>
  )
}
