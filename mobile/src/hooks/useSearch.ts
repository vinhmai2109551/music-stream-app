import { listAlbums } from "@/api/albums"
import { listArtists } from "@/api/artists"
import { listTracks } from "@/api/tracks"
import type { ApiAlbum, ApiArtist, ApiTrack } from "@/api/types"
import { buildSuggestions } from "@/utils/searchSuggestions"
import { useResource } from "./useResource"

const TRACK_LIMIT = 20
const ALBUM_LIMIT = 10
const ARTIST_LIMIT = 10
const SUGGESTION_SOURCE_LIMIT = 6

export interface SearchResults {
  tracks: ApiTrack[]
  albums: ApiAlbum[]
  artists: ApiArtist[]
}

async function loadResults(q: string): Promise<SearchResults> {
  const [tracks, albums, artists] = await Promise.all([
    listTracks({ q, limit: TRACK_LIMIT }),
    listAlbums({ q, limit: ALBUM_LIMIT }),
    listArtists({ q, limit: ARTIST_LIMIT }),
  ])
  return { tracks: tracks.items, albums: albums.items, artists: artists.items }
}

async function loadSuggestions(q: string): Promise<string[]> {
  const limit = SUGGESTION_SOURCE_LIMIT
  const [tracks, albums, artists] = await Promise.all([
    listTracks({ q, limit }),
    listAlbums({ q, limit }),
    listArtists({ q, limit }),
  ])
  return buildSuggestions(q, artists.items, tracks.items, albums.items)
}

/** Tracks, albums and artists that match `query`. */
export function useSearchResults(query: string) {
  return useResource(() => loadResults(query), `search:${query}`)
}

/** Words to offer while `query` is being typed. */
export function useSearchSuggestions(query: string) {
  return useResource(() => loadSuggestions(query), `suggest:${query}`)
}
