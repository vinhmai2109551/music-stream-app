import { Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common"
import { Role } from "../../../generated/prisma/enums.js"
import { AlbumsService, type AlbumDetail, type AlbumView } from "../../albums/index.js"
import { ArtistsService, type ArtistView } from "../../artists/index.js"
import { KnowledgeService, type KnowledgeAnswer } from "../../embeddings/index.js"
import { FollowsService } from "../../follows/index.js"
import { LikesService } from "../../likes/index.js"
import { PlaylistsService, type PlaylistDetail, type PlaylistView } from "../../playlists/index.js"
import { RecommendationsService } from "../../recommendations/index.js"
import { SearchService } from "../../search/index.js"
import { TracksService, type TrackView } from "../../tracks/index.js"
import type { ToolPorts, ToolRegion } from "./ports.js"
import { toSearchName } from "../../../shared/text/search-name.js"
import { ToolInputError } from "./tool.js"

/** Longest search text the keyword lists take. */
const KEYWORD_MAX = 100
/** Tracks shown with an artist. */
const TOP_TRACKS = 5

/** Runs `read`; a thing that does not exist is `null`, any other failure goes on. */
async function orNull<T>(read: () => Promise<T>): Promise<T | null> {
  try {
    return await read()
  } catch (error) {
    if (error instanceof NotFoundException) return null
    throw error
  }
}

/** The tools' view of the app: each method calls the service that owns the data. */
@Injectable()
export class ServiceToolPorts implements ToolPorts {
  constructor(
    private readonly tracks: TracksService,
    private readonly artists: ArtistsService,
    private readonly albums: AlbumsService,
    private readonly playlists: PlaylistsService,
    private readonly likes: LikesService,
    private readonly follows: FollowsService,
    private readonly search: SearchService,
    private readonly recommendations: RecommendationsService,
    private readonly knowledge: KnowledgeService,
  ) {}

  /** The user as the playlists service knows one: ordinary, so only their own playlists are theirs. */
  private asUser(userId: string) {
    return { id: userId, role: Role.USER }
  }

  // ------------------------------------------------------------------- the catalog

  async searchTracks(
    q: string,
    region: ToolRegion | undefined,
    limit: number,
    userId: string,
  ): Promise<{ items: TrackView[]; degraded: boolean }> {
    try {
      const found = await this.search.semantic({ q, type: "track", region, limit }, userId)
      return {
        items: found.items.flatMap((hit) => ("track" in hit ? [hit.track] : [])),
        degraded: found.degraded,
      }
    } catch (error) {
      // The search by meaning is off: the search by words still answers.
      if (!(error instanceof ServiceUnavailableException)) throw error
      const page = await this.tracks.list(
        { page: 1, limit, q: q.slice(0, KEYWORD_MAX), region },
        userId,
      )
      return { items: page.items, degraded: true }
    }
  }

  async searchArtists(
    q: string,
    region: ToolRegion | undefined,
    limit: number,
    userId: string,
  ): Promise<{ items: ArtistView[]; degraded: boolean }> {
    try {
      const found = await this.search.semantic({ q, type: "artist", region, limit }, userId)
      return {
        items: found.items.flatMap((hit) => ("artist" in hit ? [hit.artist] : [])),
        degraded: found.degraded,
      }
    } catch (error) {
      if (!(error instanceof ServiceUnavailableException)) throw error
      const page = await this.artists.list(
        { page: 1, limit, q: q.slice(0, KEYWORD_MAX), region },
        userId,
      )
      return { items: page.items, degraded: true }
    }
  }

  async searchAlbums(q: string, limit: number, userId: string): Promise<AlbumView[]> {
    return (await this.albums.list({ page: 1, limit, q: q.slice(0, KEYWORD_MAX) }, userId)).items
  }

  async searchPlaylists(q: string, limit: number, userId: string): Promise<PlaylistView[]> {
    const query = { page: 1, limit, q: q.slice(0, KEYWORD_MAX) }
    const needle = toSearchName(q)
    const mine = (await this.playlists.listMine(userId)).filter((playlist) =>
      toSearchName(playlist.name).includes(needle),
    )
    const official = (await this.playlists.listOfficial(query, userId)).items
    // The user's own first: they are the ones people mean by "my playlist".
    return [...mine, ...official].slice(0, limit)
  }

  getTrack(id: string, userId: string): Promise<TrackView | null> {
    return orNull(() => this.tracks.get(id, userId))
  }

  async getArtist(
    id: string,
    userId: string,
  ): Promise<{ artist: ArtistView; topTracks: TrackView[] } | null> {
    const artist = await orNull(() => this.artists.get(id, userId))
    if (!artist) return null
    const top = await this.tracks.list({ page: 1, limit: TOP_TRACKS, artistId: id }, userId)
    return { artist, topTracks: top.items }
  }

  getAlbum(id: string, userId: string): Promise<AlbumDetail | null> {
    return orNull(() => this.albums.get(id, userId))
  }

  getPlaylist(id: string, userId: string): Promise<PlaylistDetail | null> {
    return orNull(() => this.playlists.get(id, this.asUser(userId)))
  }

  // ------------------------------------------------------------------ to show cards

  tracksByIds(ids: string[], userId: string): Promise<TrackView[]> {
    return this.tracks.getByIds(ids, userId)
  }

  artistsByIds(ids: string[], userId: string): Promise<ArtistView[]> {
    return this.artists.getByIds(ids, userId)
  }

  async albumsByIds(ids: string[], userId: string): Promise<AlbumView[]> {
    const found = await Promise.all(ids.map((id) => this.getAlbum(id, userId)))
    return found.flatMap((album) => album ?? [])
  }

  async playlistsByIds(ids: string[], userId: string): Promise<PlaylistView[]> {
    const found = await Promise.all(ids.map((id) => this.getPlaylist(id, userId)))
    return found.flatMap((playlist) => playlist ?? [])
  }

  // --------------------------------------------------------------------- the user

  async library(userId: string) {
    const [likedTracks, followedArtists, playlists] = await Promise.all([
      this.tracks.listLiked(userId),
      this.artists.listFollowed(userId),
      this.playlists.listMine(userId),
    ])
    return { likedTracks, followedArtists, playlists }
  }

  async recommend(
    userId: string,
    limit: number,
    region: ToolRegion | undefined,
  ): Promise<{ items: TrackView[]; personal: boolean }> {
    const result = await this.recommendations.forYou(userId, limit, region)
    return { items: result.items, personal: result.strategy === "taste" }
  }

  async similar(trackId: string, limit: number, userId: string): Promise<TrackView[]> {
    try {
      return (await this.recommendations.similar(trackId, limit, userId)).items
    } catch (error) {
      if (error instanceof NotFoundException) throw new ToolInputError("No track with that id")
      if (error instanceof ServiceUnavailableException) {
        throw new ToolInputError("Finding similar tracks is not available right now")
      }
      throw error
    }
  }

  async help(question: string, limit: number): Promise<KnowledgeAnswer[]> {
    try {
      return await this.knowledge.search(question, limit)
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw new ToolInputError("Looking up help texts is not available right now")
      }
      throw error
    }
  }

  // ---------------------------------------------------------------------- changes

  async myPlaylist(userId: string, id: string): Promise<PlaylistView | null> {
    return (await this.playlists.listMine(userId)).find((playlist) => playlist.id === id) ?? null
  }

  async createPlaylist(
    userId: string,
    name: string,
    description: string | undefined,
    trackIds: string[],
  ): Promise<{ id: string; name: string; added: number }> {
    await this.assertTracksExist(trackIds, userId)
    // One transaction: the playlist and its tracks are made together or not at all.
    const created = await this.playlists.createWithTracks(
      this.asUser(userId),
      { name, description },
      trackIds,
    )
    return { id: created.id, name: created.name, added: created.trackIds.length }
  }

  async addTracks(
    userId: string,
    playlistId: string,
    trackIds: string[],
  ): Promise<{ name: string; added: number }> {
    // Only the user's own: the playlists service would let an admin write anywhere.
    const playlist = await this.myPlaylist(userId, playlistId)
    if (!playlist) throw new ToolInputError("That is not one of the user's own playlists")
    await this.assertTracksExist(trackIds, userId)
    const added = await this.playlists.addTracks(playlistId, this.asUser(userId), trackIds)
    return { name: playlist.name, added }
  }

  async likeTracks(userId: string, trackIds: string[]): Promise<void> {
    await this.assertTracksExist(trackIds, userId)
    await this.likes.likeTracks(userId, trackIds)
  }

  async followArtist(userId: string, artistId: string): Promise<void> {
    if (!(await orNull(() => this.artists.get(artistId, userId)))) {
      throw new ToolInputError("No artist with that id in the catalog")
    }
    await this.follows.follow(userId, artistId)
  }

  private async assertTracksExist(ids: string[], userId: string): Promise<void> {
    if (ids.length === 0) return
    const found = new Set((await this.tracks.getByIds(ids, userId)).map((track) => track.id))
    const missing = ids.filter((id) => !found.has(id))
    if (missing.length > 0) {
      throw new ToolInputError(`${missing.length} track id(s) are not in the catalog`)
    }
  }
}
