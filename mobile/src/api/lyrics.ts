import { api } from "./client"
import { pathId, toQuery } from "./query"
import type { ApiLyrics, ApiLyricsTranslation } from "./types"

/** The original lyrics. 404 (code LYRICS_NOT_FOUND) when the track has none. */
export const getLyrics = (trackId: string) =>
  api.get<ApiLyrics>(`/tracks/${pathId(trackId)}/lyrics`)

/**
 * The lyrics translated to `language` (an app language code). The server keeps the translation, so
 * the first request for a song and language may take a few seconds and the next ones are instant.
 */
export const getLyricsTranslation = (trackId: string, language: string) =>
  api.get<ApiLyricsTranslation>(
    `/tracks/${pathId(trackId)}/lyrics/translation${toQuery({ lang: language })}`,
  )
