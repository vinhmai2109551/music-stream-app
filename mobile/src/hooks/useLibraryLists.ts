import { listLikedAlbums } from "@/api/albums"
import { listFollowedArtists } from "@/api/artists"
import { listLikedPlaylists } from "@/api/playlists"
import { listLikedTracks } from "@/api/tracks"
import type { ApiAlbum, ApiArtist, ApiPlaylist, ApiTrack } from "@/api/types"
import { useResource } from "./useResource"

export interface LibraryLists {
  tracks: ApiTrack[]
  albums: ApiAlbum[]
  artists: ApiArtist[]
  /** Playlists of other people (or Music Stream) that the user saved. */
  likedPlaylists: ApiPlaylist[]
}

async function loadLibrary(): Promise<LibraryLists> {
  const [tracks, albums, artists, likedPlaylists] = await Promise.all([
    listLikedTracks(),
    listLikedAlbums(),
    listFollowedArtists(),
    listLikedPlaylists(),
  ])
  return { tracks, albums, artists, likedPlaylists }
}

/** What the user liked and followed, most recent first. */
export function useLibraryLists() {
  return useResource(loadLibrary, "library")
}
