import { ConfigProvider } from "antd"
import viVN from "antd/locale/vi_VN"
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { buildTheme } from "./antdTheme"
import {
  ColorModeContext,
  initialColorMode,
  saveColorMode,
  type ColorMode,
  type ColorModeValue,
} from "./color-mode"

/** The Vietnamese locale of Ant Design lacks the word for "optional" and shows the English one. */
const LOCALE: typeof viVN = {
  ...viVN,
  Form: { ...(viVN.Form as NonNullable<typeof viVN.Form>), optional: " (không bắt buộc)" },
}

/** Dark / light mode for Ant Design and for the page behind it. */
export function ColorModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ColorMode>(initialColorMode)

  useEffect(() => {
    document.documentElement.dataset.theme = mode
    document.documentElement.style.colorScheme = mode
  }, [mode])

  const toggle = useCallback(() => {
    setMode((current) => {
      const next = current === "dark" ? "light" : "dark"
      saveColorMode(next)
      return next
    })
  }, [])

  const value = useMemo<ColorModeValue>(() => ({ mode, toggle }), [mode, toggle])
  const themeConfig = useMemo(() => buildTheme(mode), [mode])

  return (
    <ColorModeContext.Provider value={value}>
      <ConfigProvider locale={LOCALE} theme={themeConfig}>
        {children}
      </ConfigProvider>
    </ColorModeContext.Provider>
  )
}
