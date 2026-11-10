import type { AlbumView } from "../../albums/index.js"
import type { ArtistView } from "../../artists/index.js"
import type { PlaylistView } from "../../playlists/index.js"
import type { TrackView } from "../../tracks/index.js"
import type { JsonValue } from "./tool.js"

/** Most items of a list that go back to the model: it reads them all, and the app shows the rest. */
export const MAX_ITEMS = 10

const cut = (text: string, max: number) =>
  text.length <= max ? text : `${text.slice(0, max - 1)}…`

/**
 * A track as the model sees it: what it needs to choose and to explain (never covers or video ids).
 * The description comes from the catalog and is data: a model told otherwise by the system prompt
 * does not follow orders found in it.
 */
export function compactTrack(track: TrackView): JsonValue {
  return {
    id: track.id,
    title: cut(track.title, 120),
    artist: cut(track.artist, 80),
    artistId: track.artistId,
    genres: track.genres.slice(0, 4),
    mood: track.mood.slice(0, 4),
    language: track.language,
    durationSec: track.duration,
    description: cut(track.description, 200),
    liked: track.liked,
  }
}

export function compactArtist(artist: ArtistView): JsonValue {
  return {
    id: artist.id,
    name: cut(artist.name, 80),
    region: artist.region,
    genres: artist.genres.slice(0, 4),
    followers: artist.followers,
    followed: artist.followed,
    bio: cut(artist.bio, 240),
  }
}

export function compactAlbum(album: AlbumView): JsonValue {
  return {
    id: album.id,
    title: cut(album.title, 120),
    artist: cut(album.artist, 80),
    trackCount: album.trackIds.length,
  }
}

export function compactPlaylist(playlist: PlaylistView): JsonValue {
  return {
    id: playlist.id,
    name: cut(playlist.name, 100),
    owner: cut(playlist.owner, 60),
    description: cut(playlist.description, 160),
    trackCount: playlist.trackIds.length,
  }
}

/** The first `MAX_ITEMS` of a list, with how many there are in all. */
export function listOf<T>(
  items: readonly T[],
  compact: (item: T) => JsonValue,
  max = MAX_ITEMS,
): { total: number; items: JsonValue[] } {
  return { total: items.length, items: items.slice(0, max).map(compact) }
}
