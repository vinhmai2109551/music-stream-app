import type { ApiPlaylist, ApiTrack } from "@/api/types"
import { colors } from "@/theme"
import type { ChartItem, Suggestion } from "@/types"

const CHART_GRADIENTS = Object.values(colors.chartGradients)
/** "Top 50 – Canada" or "Top 50 - Canada": title before the dash, place after it. */
const TITLE_SEPARATOR = /\s[–-]\s/

/** An editorial playlist shown as a gradient chart card; gradients repeat in order. */
export function toChartItem(playlist: ApiPlaylist, index: number): ChartItem {
  const [title, place = ""] = playlist.name.split(TITLE_SEPARATOR)
  return {
    id: playlist.id,
    title,
    country: place,
    description: playlist.description,
    gradient: CHART_GRADIENTS[index % CHART_GRADIENTS.length],
  }
}

/** A track shown as a large "suggested for you" card. */
export function toSuggestion(track: ApiTrack): Suggestion {
  return {
    id: track.id,
    title: track.title,
    subtitle: track.artist,
    image: track.cover,
    trackId: track.id,
  }
}
