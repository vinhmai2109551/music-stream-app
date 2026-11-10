import { ConfigProvider, theme } from "antd"
import viVN from "antd/locale/vi_VN"
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import {
  ColorModeContext,
  initialColorMode,
  saveColorMode,
  type ColorMode,
  type ColorModeValue,
} from "./color-mode"

const PRIMARY = "#1677ff"

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

  return (
    <ColorModeContext.Provider value={value}>
      <ConfigProvider
        locale={viVN}
        theme={{
          algorithm: mode === "dark" ? theme.darkAlgorithm : theme.defaultAlgorithm,
          token: { colorPrimary: PRIMARY, borderRadius: 8 },
        }}
      >
        {children}
      </ConfigProvider>
    </ColorModeContext.Provider>
  )
}
