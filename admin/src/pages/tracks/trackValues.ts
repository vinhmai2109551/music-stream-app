import type { Row } from "@/api/resources"
import type { TrackView } from "@/api/types"
import { parseYouTubeVideoId } from "@/lib/youtube"

/** Limits of the API (backend shared/validation/limits.ts). */
export const LIST_MAX_ITEMS = 10
export const LIST_ITEM_MAX_LENGTH = 40
export const DESCRIPTION_MAX_LENGTH = 600

export type PlaybackSource = "youtube" | "audio"

export interface TrackFormValues {
  title: string
  artistId: string
  coverUrl: string
  /** Which of the two ways to play the track is used; exactly one (never both). */
  source: PlaybackSource
  /** What was typed for YouTube: a link or an id. */
  youtubeInput: string
  audioUrl: string
  durationSec: number
  genres: string[]
  mood: string[]
  tags: string[]
  description: string
  language?: string | null
}

/** The form's values for a track being edited (the API's row has no `source` or `youtubeInput`). */
export function initialTrackValues(track: TrackView): TrackFormValues {
  const fromYouTube = Boolean(track.youtubeVideoId)
  return {
    title: track.title,
    artistId: track.artistId,
    coverUrl: track.cover,
    source: fromYouTube ? "youtube" : "audio",
    youtubeInput: track.youtubeVideoId ?? "",
    audioUrl: track.audioUrl ?? "",
    durationSec: track.duration,
    genres: track.genres,
    mood: track.mood,
    tags: track.tags,
    description: track.description,
    language: track.language,
  }
}

/**
 * The body for the API. Only the chosen source is kept, the other is cleared (null): a track that
 * has both would play the audio file and ignore the video, and a track with neither cannot play.
 */
export function toTrackBody(values: TrackFormValues): Row {
  const base: Row = {
    title: values.title.trim(),
    artistId: values.artistId,
    coverUrl: values.coverUrl,
    durationSec: values.durationSec,
    genres: values.genres ?? [],
    mood: values.mood ?? [],
    tags: values.tags ?? [],
    description: (values.description ?? "").trim(),
    language: values.language ? values.language : null,
  }
  return values.source === "youtube"
    ? { ...base, youtubeVideoId: parseYouTubeVideoId(values.youtubeInput), audioUrl: null }
    : { ...base, audioUrl: values.audioUrl || null, youtubeVideoId: null }
}

/** Problems with one list field (genres, moods or tags), or null when it is fine. */
export function listProblem(label: string, list: readonly string[] | undefined): string | null {
  if (!list) return null
  if (list.length > LIST_MAX_ITEMS) return `${label}: tối đa ${LIST_MAX_ITEMS} mục.`
  if (list.some((item) => item.trim() === "")) return `${label}: không được có mục trống.`
  if (list.some((item) => item.length > LIST_ITEM_MAX_LENGTH)) {
    return `${label}: mỗi mục tối đa ${LIST_ITEM_MAX_LENGTH} ký tự.`
  }
  return null
}
