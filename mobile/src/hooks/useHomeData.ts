import { listAlbums } from "@/api/albums"
import { listArtists } from "@/api/artists"
import { listOfficialPlaylists } from "@/api/playlists"
import { listTracks } from "@/api/tracks"
import type { ApiAlbum, ApiArtist, ApiPlaylist, ApiTrack } from "@/api/types"
import { useResource } from "./useResource"

const SECTION_LIMIT = 10

export interface HomeData {
  /** The most played tracks. */
  suggestions: ApiTrack[]
  /** Editorial playlists, shown as charts. */
  charts: ApiPlaylist[]
  albums: ApiAlbum[]
  artists: ApiArtist[]
}

async function loadHome(): Promise<HomeData> {
  const query = { limit: SECTION_LIMIT }
  const [tracks, charts, albums, artists] = await Promise.all([
    listTracks(query),
    listOfficialPlaylists(query),
    listAlbums(query),
    listArtists(query),
  ])
  return {
    suggestions: tracks.items,
    charts: charts.items,
    albums: albums.items,
    artists: artists.items,
  }
}

/** Everything the Home screen shows, loaded together. */
export function useHomeData() {
  return useResource(loadHome, "home")
}
