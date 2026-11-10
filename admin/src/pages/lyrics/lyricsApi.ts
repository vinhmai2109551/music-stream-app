import { api } from "@/api/http"
import { ApiError } from "@/api/errors"
import type { LyricsTranslation, LyricsView } from "@/api/types"
import type { SavedLyrics } from "./draft"

/** The track exists but has no lyrics: not a failure, the editor starts empty. */
export async function fetchLyrics(
  trackId: string,
  signal?: AbortSignal,
): Promise<SavedLyrics | null> {
  try {
    const view = await api<LyricsView>(`/tracks/${encodeURIComponent(trackId)}/lyrics`, { signal })
    return { language: view.language, lines: view.lines, timingsMs: view.timingsMs }
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.statusCode === 404 &&
      error.code === "LYRICS_NOT_FOUND"
    ) {
      return null
    }
    throw error
  }
}

/** Lyrics typed or synced here are `manual`: own work, or text the person may store. */
export const LYRICS_SOURCE = "manual"

export async function saveLyrics(trackId: string, lyrics: SavedLyrics): Promise<SavedLyrics> {
  const view = await api<LyricsView>(`/tracks/${encodeURIComponent(trackId)}/lyrics`, {
    method: "PUT",
    body: {
      language: lyrics.language,
      lines: lyrics.lines,
      // Without timings the field is left out; an empty list would mean the same, but this is clearer.
      ...(lyrics.timingsMs === null ? {} : { timingsMs: lyrics.timingsMs }),
      source: LYRICS_SOURCE,
    },
  })
  return { language: view.language, lines: view.lines, timingsMs: view.timingsMs }
}

export function fetchTranslation(trackId: string, lang: string): Promise<LyricsTranslation> {
  return api<LyricsTranslation>(`/tracks/${encodeURIComponent(trackId)}/lyrics/translation`, {
    query: { lang },
  })
}
