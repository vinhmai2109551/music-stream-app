import type { Region } from "@/api/types"
import type { TranslationKey } from "@/i18n"

export interface RegionFilter {
  /** `null` is "all regions". */
  region: Region | null
  labelKey: TranslationKey
}

/** The region chips of the Home screen, in order. GLOBAL (the sample artists) only shows under "all". */
export const REGION_FILTERS: readonly RegionFilter[] = [
  { region: null, labelKey: "home.regions.all" },
  { region: "VIETNAM", labelKey: "home.regions.vietnam" },
  { region: "KOREA", labelKey: "home.regions.korea" },
  { region: "JAPAN", labelKey: "home.regions.japan" },
  { region: "CHINA", labelKey: "home.regions.china" },
]
