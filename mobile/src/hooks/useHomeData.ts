import { listAlbums } from "@/api/albums"
import { listArtists } from "@/api/artists"
import { listOfficialPlaylists } from "@/api/playlists"
import { listTracks } from "@/api/tracks"
import type { ApiAlbum, ApiArtist, ApiPlaylist, ApiTrack, Region } from "@/api/types"
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

async function loadHome(region: Region | null): Promise<HomeData> {
  const query = { limit: SECTION_LIMIT }
  // Only tracks and artists belong to a region; charts and albums are the same for everyone.
  const regional = region ? { ...query, region } : query
  const [tracks, charts, albums, artists] = await Promise.all([
    listTracks(regional),
    listOfficialPlaylists(query),
    listAlbums(query),
    listArtists(regional),
  ])
  return {
    suggestions: tracks.items,
    charts: charts.items,
    albums: albums.items,
    artists: artists.items,
  }
}

/** Everything the Home screen shows, loaded together; `null` is every region. */
export function useHomeData(region: Region | null) {
  return useResource(() => loadHome(region), `home:${region ?? "all"}`)
}
