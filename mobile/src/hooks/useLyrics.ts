import { getLyrics, getLyricsTranslation } from "@/api/lyrics"
import { cachedLoad } from "@/utils/lyricsCache"
import { useResource } from "./useResource"

/** The original lyrics of a track. */
export function useLyrics(trackId: string) {
  return useResource(
    () => cachedLoad(`lyrics:${trackId}`, () => getLyrics(trackId)),
    `lyrics:${trackId}`,
  )
}

/**
 * The lyrics in `language`. Mount the component that calls it only when the person asks for the
 * translation: loading starts on mount, and the server may have to translate.
 */
export function useLyricsTranslation(trackId: string, language: string) {
  const key = `lyrics:${trackId}:${language}`
  return useResource(() => cachedLoad(key, () => getLyricsTranslation(trackId, language)), key)
}
