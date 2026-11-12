import { theme, type ThemeConfig } from "antd"
import { BRAND, FONT_STACK } from "./brand"
import type { ColorMode } from "./color-mode"

/** The Ant Design theme of each mode: brand accent, Be Vietnam Pro, calmer surfaces. */
export function buildTheme(mode: ColorMode): ThemeConfig {
  const dark = mode === "dark"
  const primary = dark ? BRAND.cyan : BRAND.cyanDeep
  return {
    algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      colorPrimary: primary,
      colorInfo: primary,
      colorLink: primary,
      fontFamily: FONT_STACK,
      borderRadius: 10,
      borderRadiusSM: 8,
      borderRadiusLG: 14,
      colorBgLayout: dark ? "#080B16" : "#F4F6FA",
      colorBgContainer: dark ? "#10152A" : "#FFFFFF",
      colorBgElevated: dark ? "#161C35" : "#FFFFFF",
      colorBorder: dark ? "rgba(255, 255, 255, 0.16)" : "#D5DBE6",
      colorBorderSecondary: dark ? "rgba(255, 255, 255, 0.08)" : "#E6EAF2",
      colorTextSecondary: dark ? "#A3ACC2" : "#5B6578",
      // The default placeholder is 2.3:1 on white; this is 4.8:1 (light) and about 6:1 (dark).
      colorTextPlaceholder: dark ? "#8E98B0" : "#6B7385",
    },
    components: {
      // Dark text on the bright cyan (7:1); on the deeper cyan of light mode white is right.
      Button: dark ? { primaryColor: BRAND.cyanInk, fontWeight: 500 } : { fontWeight: 500 },
      Radio: dark ? { buttonSolidCheckedColor: BRAND.cyanInk } : {},
      Table: {
        headerBg: dark ? "rgba(255, 255, 255, 0.03)" : "#F8FAFD",
        headerColor: dark ? "#A3ACC2" : "#5B6578",
        rowHoverBg: dark ? "rgba(31, 184, 224, 0.07)" : "#F1F8FC",
      },
      Card: { headerFontSize: 15 },
    },
  }
}

/** The side menu is dark in both modes, like the stage lights it stands behind. */
export const SIDER_THEME: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: BRAND.cyan,
    fontFamily: FONT_STACK,
    colorBgContainer: BRAND.ink,
    colorBgElevated: "#161C35",
  },
  components: {
    Layout: { siderBg: BRAND.ink, triggerBg: "#141A33", triggerColor: "#A3ACC2" },
    Menu: {
      itemBg: "transparent",
      itemColor: "#B7C0D6",
      itemHoverBg: "rgba(255, 255, 255, 0.06)",
      itemHoverColor: "#FFFFFF",
      itemSelectedBg: "rgba(31, 184, 224, 0.16)",
      itemSelectedColor: BRAND.cyan,
      itemBorderRadius: 10,
    },
  },
}
