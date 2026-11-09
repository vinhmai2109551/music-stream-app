import { compactAlbum, compactArtist, compactPlaylist, compactTrack, listOf } from "./compact.js"
import { REGIONS, type ToolPorts } from "./ports.js"
import {
  enumArg,
  intArg,
  textArg,
  ToolInputError,
  type ImmediateTool,
  type JsonValue,
} from "./tool.js"

const TYPES = ["track", "artist", "album", "playlist"] as const
const LIMIT = { min: 1, max: 10, fallback: 6 }
const NOT_FOUND = (what: string) => new ToolInputError(`No ${what} with that id in the catalog`)

const idParameter = (what: string) => ({
  type: "object",
  properties: { id: { type: "string", description: `Id of the ${what}, as returned by a search` } },
  required: ["id"],
})

/** The tools that look things up in the catalog of the app. */
export function catalogTools(ports: ToolPorts): ImmediateTool[] {
  return [
    {
      name: "search_catalog",
      kind: "read",
      description:
        "Search the music catalog of the app by meaning and by words: a mood, an occasion, a style, a " +
        "title or a name (accents do not matter). Use it before suggesting any song, artist, album or " +
        "playlist. Returns the best matches with their ids.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "What to look for, in the user's own words" },
          type: { type: "string", enum: [...TYPES], description: "What to find (default track)" },
          region: {
            type: "string",
            enum: [...REGIONS],
            description: "Only tracks or artists of this region",
          },
          limit: { type: "integer", description: "How many results, 1 to 10 (default 6)" },
        },
        required: ["query"],
      },
      async run({ userId }, args) {
        const q = textArg(args, "query", { max: 200 })!
        const type = enumArg(args, "type", TYPES, "track")!
        const region = enumArg(args, "region", REGIONS)
        const limit = intArg(args, "limit", LIMIT)
        if (type === "track") {
          const { items, degraded } = await ports.searchTracks(q, region, limit, userId)
          return {
            result: {
              kind: "tracks",
              ...listOf(items, compactTrack),
              ...(degraded ? { note: "Matched by words only" } : {}),
            },
            display: { tracks: items.map((track) => track.id) },
          }
        }
        if (type === "artist") {
          const { items } = await ports.searchArtists(q, region, limit, userId)
          return {
            result: { kind: "artists", ...listOf(items, compactArtist) },
            display: { artists: items.map((artist) => artist.id) },
          }
        }
        if (type === "album") {
          const items = await ports.searchAlbums(q, limit, userId)
          return {
            result: { kind: "albums", ...listOf(items, compactAlbum) },
            display: { albums: items.map((album) => album.id) },
          }
        }
        const items = await ports.searchPlaylists(q, limit, userId)
        return {
          result: { kind: "playlists", ...listOf(items, compactPlaylist) },
          display: { playlists: items.map((playlist) => playlist.id) },
        }
      },
    },
    {
      name: "get_track",
      kind: "read",
      description:
        "Details of one track: genres, moods, a short description of its style, language.",
      parameters: idParameter("track"),
      async run({ userId }, args) {
        const track = await ports.getTrack(textArg(args, "id", { max: 100 })!, userId)
        if (!track) throw NOT_FOUND("track")
        return {
          result: { kind: "track", track: compactTrack(track) },
          display: { tracks: [track.id] },
        }
      },
    },
    {
      name: "get_artist",
      kind: "read",
      description: "Details of one artist with some of their most played tracks.",
      parameters: idParameter("artist"),
      async run({ userId }, args) {
        const found = await ports.getArtist(textArg(args, "id", { max: 100 })!, userId)
        if (!found) throw NOT_FOUND("artist")
        const result: JsonValue = {
          kind: "artist",
          artist: compactArtist(found.artist),
          topTracks: found.topTracks.slice(0, 5).map(compactTrack),
        }
        return {
          result,
          display: {
            artists: [found.artist.id],
            tracks: found.topTracks.slice(0, 5).map((t) => t.id),
          },
        }
      },
    },
    {
      name: "get_album",
      kind: "read",
      description: "Details of one album and the first tracks on it.",
      parameters: idParameter("album"),
      async run({ userId }, args) {
        const album = await ports.getAlbum(textArg(args, "id", { max: 100 })!, userId)
        if (!album) throw NOT_FOUND("album")
        return {
          result: {
            kind: "album",
            album: compactAlbum(album),
            tracks: album.tracks.slice(0, 10).map(compactTrack),
          },
          display: { albums: [album.id], tracks: album.tracks.slice(0, 10).map((t) => t.id) },
        }
      },
    },
    {
      name: "get_playlist",
      kind: "read",
      description:
        "Details of one playlist (an editorial one, or one of the user's own) and the first tracks in it.",
      parameters: idParameter("playlist"),
      async run({ userId }, args) {
        const playlist = await ports.getPlaylist(textArg(args, "id", { max: 100 })!, userId)
        if (!playlist) throw NOT_FOUND("playlist")
        return {
          result: {
            kind: "playlist",
            playlist: compactPlaylist(playlist),
            tracks: playlist.tracks.slice(0, 10).map(compactTrack),
          },
          display: {
            playlists: [playlist.id],
            tracks: playlist.tracks.slice(0, 10).map((t) => t.id),
          },
        }
      },
    },
  ]
}
