import type { Region } from "@/api/types"
import { copy } from "./copy"

export interface RegionFilter {
  /** `null` is "all regions". */
  region: Region | null
  label: string
}

/** The region chips of the Home screen, in order. GLOBAL (the sample artists) only shows under "all". */
export const REGION_FILTERS: readonly RegionFilter[] = [
  { region: null, label: copy.home.regions.all },
  { region: "VIETNAM", label: copy.home.regions.vietnam },
  { region: "KOREA", label: copy.home.regions.korea },
  { region: "JAPAN", label: copy.home.regions.japan },
  { region: "CHINA", label: copy.home.regions.china },
]
