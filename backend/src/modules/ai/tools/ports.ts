import type { AlbumDetail, AlbumView } from "../../albums/index.js"
import type { ArtistView } from "../../artists/index.js"
import type { KnowledgeAnswer } from "../../embeddings/index.js"
import type { PlaylistDetail, PlaylistView } from "../../playlists/index.js"
import type { TrackView } from "../../tracks/index.js"

/** Where an artist comes from: the values of the catalog's regions. */
export const REGIONS = ["VIETNAM", "KOREA", "JAPAN", "CHINA", "GLOBAL"] as const
export type ToolRegion = (typeof REGIONS)[number]

/**
 * Everything the tools need from the rest of the API, as plain functions. The tools are written
 * against this, not against the services, so they can be tested without a database. Methods throw
 * `ToolInputError` for a thing that is not there or not the user's; anything else is a real error.
 */
export interface ToolPorts {
  // ---- the catalog
  /** `degraded`: only the search by words answered (the search by meaning is off or failed). */
  searchTracks(
    q: string,
    region: ToolRegion | undefined,
    limit: number,
    userId: string,
  ): Promise<{ items: TrackView[]; degraded: boolean }>
  searchArtists(
    q: string,
    region: ToolRegion | undefined,
    limit: number,
    userId: string,
  ): Promise<{ items: ArtistView[]; degraded: boolean }>
  searchAlbums(q: string, limit: number, userId: string): Promise<AlbumView[]>
  /** The editorial playlists whose name matches. */
  searchPlaylists(q: string, limit: number, userId: string): Promise<PlaylistView[]>
  getTrack(id: string, userId: string): Promise<TrackView | null>
  getArtist(
    id: string,
    userId: string,
  ): Promise<{ artist: ArtistView; topTracks: TrackView[] } | null>
  getAlbum(id: string, userId: string): Promise<AlbumDetail | null>
  /** An editorial playlist or one of the user's own; null for anyone else's. */
  getPlaylist(id: string, userId: string): Promise<PlaylistDetail | null>

  // ---- to show cards (unknown ids are left out)
  tracksByIds(ids: string[], userId: string): Promise<TrackView[]>
  artistsByIds(ids: string[], userId: string): Promise<ArtistView[]>
  albumsByIds(ids: string[], userId: string): Promise<AlbumView[]>
  playlistsByIds(ids: string[], userId: string): Promise<PlaylistView[]>

  // ---- the user
  library(userId: string): Promise<{
    likedTracks: TrackView[]
    followedArtists: ArtistView[]
    playlists: PlaylistView[]
  }>
  recommend(
    userId: string,
    limit: number,
    region: ToolRegion | undefined,
  ): Promise<{ items: TrackView[]; personal: boolean }>
  similar(trackId: string, limit: number, userId: string): Promise<TrackView[]>
  help(question: string, limit: number): Promise<KnowledgeAnswer[]>

  // ---- changes (only after the person agrees)
  /** The user's own playlist, or null. */
  myPlaylist(userId: string, id: string): Promise<PlaylistView | null>
  createPlaylist(
    userId: string,
    name: string,
    description: string | undefined,
    trackIds: string[],
  ): Promise<{ id: string; name: string; added: number }>
  addTracks(
    userId: string,
    playlistId: string,
    trackIds: string[],
  ): Promise<{ name: string; added: number }>
  likeTracks(userId: string, trackIds: string[]): Promise<void>
  followArtist(userId: string, artistId: string): Promise<void>
}
