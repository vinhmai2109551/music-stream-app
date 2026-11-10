import type { ApiAlbum, ApiTrack } from "@/api/types"

/** A remote image URL, or a bundled asset (`require(...)`). Both work with expo-image. */
export type ImageSource = string | number

// The UI works with the shapes the API returns; there is no second copy of these models.
export type Track = ApiTrack
export type Album = ApiAlbum

/** A track shown as a large "suggested for you" card on Home. */
export type Suggestion = {
  id: string
  title: string
  subtitle: string
  image: ImageSource
  trackId: string
  /** The track's official video, whose picture stands in for a missing cover. */
  youtubeVideoId?: string | null
}

/** An editorial playlist shown as a gradient card on Home. */
export type ChartItem = {
  /** Id of the playlist this chart opens. */
  id: string
  title: string
  country: string
  description: string
  gradient: readonly [string, string]
}

export type RepeatMode = "off" | "all" | "one"
