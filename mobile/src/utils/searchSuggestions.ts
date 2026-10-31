import type { ApiAlbum, ApiArtist, ApiTrack } from "@/api/types"

const MAX_SUGGESTIONS = 8

/**
 * The words offered while typing: artist names, then song titles, then album titles that contain
 * what was typed, without repeats.
 */
export function buildSuggestions(
  query: string,
  artists: readonly Pick<ApiArtist, "name">[],
  tracks: readonly Pick<ApiTrack, "title">[],
  albums: readonly Pick<ApiAlbum, "title">[],
  limit: number = MAX_SUGGESTIONS,
): string[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return []
  const seen = new Set<string>()
  const result: string[] = []
  for (const text of [
    ...artists.map((artist) => artist.name),
    ...tracks.map((track) => track.title),
    ...albums.map((album) => album.title),
  ]) {
    const key = text.toLowerCase()
    if (!key.includes(needle) || seen.has(key)) continue
    seen.add(key)
    result.push(text)
    if (result.length === limit) break
  }
  return result
}
