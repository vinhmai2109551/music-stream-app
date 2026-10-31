import { ScrollView, StyleSheet } from "react-native"
import type { Region } from "@/api/types"
import { Chip } from "@/components/ui/Chip"
import { copy } from "@/constants/copy"
import { REGION_FILTERS } from "@/constants/regions"
import { spacing } from "@/theme"

type RegionChipsProps = {
  /** The chosen region; `null` is all of them. */
  selected: Region | null
  onSelect: (region: Region | null) => void
}

/** One chip per region of the catalog (Vietnam, K-Pop, J-Pop, C-Pop) plus "all". */
export function RegionChips({ selected, onSelect }: RegionChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityLabel={copy.home.regionsLabel}
      style={styles.scroll}
      contentContainerStyle={styles.content}
    >
      {REGION_FILTERS.map((filter) => (
        <Chip
          key={filter.region ?? "all"}
          label={filter.label}
          selected={filter.region === selected}
          onPress={() => onSelect(filter.region)}
        />
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0, marginTop: spacing.xl },
  content: { paddingHorizontal: spacing.screen, gap: spacing.sm },
})
