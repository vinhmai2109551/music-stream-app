import { jest } from "@jest/globals"
import type { AlbumDetail } from "../../albums/index.js"
import type { ArtistView } from "../../artists/index.js"
import type { PlaylistDetail, PlaylistView } from "../../playlists/index.js"
import type { TrackView } from "../../tracks/index.js"
import type { ToolPorts } from "../tools/ports.js"
import { ToolInputError } from "../tools/tool.js"

export const track = (id: string, extra: Partial<TrackView> = {}): TrackView => ({
  id,
  title: `Bài ${id}`,
  artist: `Nghệ sĩ ${id}`,
  artistId: `artist-${id}`,
  cover: `https://media.example/${id}.jpg`,
  audioUrl: null,
  plays: 10,
  duration: 200,
  youtubeVideoId: "Llw9Q6akRo4",
  genres: ["pop"],
  mood: ["buồn"],
  tags: ["mưa"],
  description: `Mô tả bài ${id}`,
  language: "vi",
  likesCount: 0,
  liked: false,
  ...extra,
})

export const artist = (id: string): ArtistView => ({
  id,
  name: `Nghệ sĩ ${id}`,
  bio: `Tiểu sử ${id}`,
  image: `https://media.example/${id}.jpg`,
  region: "VIETNAM",
  genres: ["v-pop"],
  followers: 5,
  followed: false,
})

export const playlist = (
  id: string,
  ownerId: string | null,
  trackIds: string[] = [],
): PlaylistView => ({
  id,
  name: `Playlist ${id}`,
  owner: ownerId ? "Tôi" : "Music Stream",
  ownerId,
  isOfficial: ownerId === null,
  description: "",
  cover: null,
  trackIds,
  likesCount: 0,
  liked: false,
})

export const TRACK_IDS = ["t1", "t2", "t3", "t4", "t5"]

/** A small catalog in memory, with every call recorded, for the tests of tools and of the agent. */
export function fakeToolPorts(options: { semantic?: boolean } = {}) {
  const tracks = new Map(TRACK_IDS.map((id) => [id, track(id)]))
  const artists = new Map(["artist-t1", "artist-t2"].map((id) => [id, artist(id)]))
  const playlists = new Map<string, PlaylistView>([
    ["mine", playlist("mine", "u1", ["t1"])],
    ["theirs", playlist("theirs", "u2")],
    ["official", playlist("official", null, ["t1", "t2"])],
  ])
  const state = {
    liked: new Set<string>(),
    followed: new Set<string>(),
    created: [] as { name: string; trackIds: string[] }[],
    added: [] as { playlistId: string; trackIds: string[] }[],
  }
  const byIds = <T>(ids: string[], map: Map<string, T>) => ids.flatMap((id) => map.get(id) ?? [])

  const ports = {
    searchTracks: jest.fn(async (q: string, _region: unknown, limit: number, _userId: string) => ({
      items: [...tracks.values()].slice(0, limit),
      degraded: options.semantic === false && q !== "",
    })),
    searchArtists: jest.fn(async () => ({ items: [...artists.values()], degraded: false })),
    searchAlbums: jest.fn(async () => []),
    searchPlaylists: jest.fn(async () => [playlists.get("official")!]),
    getTrack: jest.fn(async (id: string) => tracks.get(id) ?? null),
    getArtist: jest.fn(async (id: string) => {
      const found = artists.get(id)
      return found ? { artist: found, topTracks: [...tracks.values()].slice(0, 2) } : null
    }),
    getAlbum: jest.fn(async (): Promise<AlbumDetail | null> => null),
    getPlaylist: jest.fn(async (id: string, userId: string): Promise<PlaylistDetail | null> => {
      const found = playlists.get(id)
      if (!found || (found.ownerId !== null && found.ownerId !== userId)) return null
      return { ...found, tracks: byIds(found.trackIds, tracks) }
    }),
    tracksByIds: jest.fn(async (ids: string[]) => byIds(ids, tracks)),
    artistsByIds: jest.fn(async (ids: string[]) => byIds(ids, artists)),
    albumsByIds: jest.fn(async () => []),
    playlistsByIds: jest.fn(async (ids: string[]) => byIds(ids, playlists)),
    library: jest.fn(async (userId: string) => ({
      likedTracks: byIds([...state.liked], tracks),
      followedArtists: byIds([...state.followed], artists),
      playlists: [...playlists.values()].filter((p) => p.ownerId === userId),
    })),
    recommend: jest.fn(async (_userId: string, limit: number) => ({
      items: [...tracks.values()].slice(0, limit),
      personal: true,
    })),
    similar: jest.fn(async (trackId: string) => {
      if (!tracks.has(trackId)) throw new ToolInputError("No track with that id")
      return [...tracks.values()].filter((t) => t.id !== trackId).slice(0, 3)
    }),
    help: jest.fn(async () => [
      { source: "premium.md", heading: "Premium › Các gói", content: "Ba gói.", score: 0.8123 },
    ]),
    myPlaylist: jest.fn(async (userId: string, id: string) => {
      const found = playlists.get(id)
      return found && found.ownerId === userId ? found : null
    }),
    createPlaylist: jest.fn(
      async (_userId: string, name: string, _d: unknown, trackIds: string[]) => {
        state.created.push({ name, trackIds })
        const id = `new-${state.created.length}`
        playlists.set(id, playlist(id, "u1", trackIds))
        return { id, name, added: trackIds.length }
      },
    ),
    addTracks: jest.fn(async (userId: string, playlistId: string, trackIds: string[]) => {
      const found = playlists.get(playlistId)
      if (!found || found.ownerId !== userId) {
        throw new ToolInputError("That is not one of the user's own playlists")
      }
      state.added.push({ playlistId, trackIds })
      return { name: found.name, added: trackIds.length }
    }),
    likeTracks: jest.fn(async (_userId: string, trackIds: string[]) => {
      for (const id of trackIds) state.liked.add(id)
    }),
    followArtist: jest.fn(async (_userId: string, artistId: string) => {
      state.followed.add(artistId)
    }),
  }
  return { ports: ports as unknown as ToolPorts, mocks: ports, state }
}
