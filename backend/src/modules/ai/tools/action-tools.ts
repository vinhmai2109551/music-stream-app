import type { TrackView } from "../../tracks/index.js"
import type { ToolPorts } from "./ports.js"
import {
  idsArg,
  textArg,
  ToolInputError,
  type ImmediateTool,
  type ToolContext,
  type WriteTool,
} from "./tool.js"
import type { JsonObject } from "../../../shared/llm/llm-client.js"

/** Tracks one tool call may name. */
export const MAX_TRACKS = 50
const PLAYLIST_NAME_MAX = 100
const PLAYLIST_DESCRIPTION_MAX = 500
const TITLES_SHOWN = 3

const trackIdsParameter = (required: boolean) => ({
  type: "array",
  items: { type: "string" },
  maxItems: MAX_TRACKS,
  description: `Ids of tracks from the catalog (at most ${MAX_TRACKS})${required ? "" : ", optional"}`,
})

/** The tracks of `ids` that exist, in the order asked; an id that does not is an error. */
async function existingTracks(
  ports: ToolPorts,
  ids: string[],
  { userId }: ToolContext,
): Promise<TrackView[]> {
  const found = await ports.tracksByIds(ids, userId)
  const known = new Set(found.map((track) => track.id))
  const missing = ids.filter((id) => !known.has(id))
  if (missing.length > 0) {
    throw new ToolInputError(
      `${missing.length} track id(s) are not in the catalog: ${missing.slice(0, 5).join(", ")}. ` +
        "Search the catalog and use the ids it returns.",
    )
  }
  return ids.map((id) => found.find((track) => track.id === id)!)
}

/** "A, B, C and 2 more" for the sentence that the person approves. */
function titles(tracks: readonly TrackView[]): string {
  const shown = tracks.slice(0, TITLES_SHOWN).map((track) => `“${track.title}”`)
  const more = tracks.length - shown.length
  return more > 0 ? `${shown.join(", ")} và ${more} bài nữa` : shown.join(", ")
}

/** Asks the app to play tracks. It changes nothing of the user's, so it needs no approval. */
export function playTool(ports: ToolPorts): ImmediateTool {
  return {
    name: "play_tracks",
    kind: "client",
    description:
      "Start playing tracks in the app now, in the order given. Use it when the user asks to play or " +
      "listen to something; take the ids from a search first.",
    parameters: {
      type: "object",
      properties: { trackIds: trackIdsParameter(true) },
      required: ["trackIds"],
    },
    async run(context, args) {
      const ids = idsArg(args, "trackIds", { min: 1, max: MAX_TRACKS })
      const tracks = await existingTracks(ports, ids, context)
      return {
        result: { kind: "played", count: tracks.length, first: tracks[0].title },
        display: { tracks: ids.slice(0, 10) },
        clientAction: { action: "play_tracks", trackIds: ids },
      }
    },
  }
}

/** The four tools that change the data of the user. The model only proposes them. */
export function writeTools(ports: ToolPorts): WriteTool[] {
  return [
    {
      name: "create_playlist",
      kind: "write",
      description:
        "Propose creating a new playlist of the user, optionally filled with tracks. The user must " +
        "agree before anything is created.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Name of the playlist" },
          description: { type: "string", description: "A short description, optional" },
          trackIds: trackIdsParameter(false),
        },
        required: ["name"],
      },
      async propose(context, args) {
        const name = textArg(args, "name", { max: PLAYLIST_NAME_MAX })!
        const description = textArg(args, "description", {
          max: PLAYLIST_DESCRIPTION_MAX,
          optional: true,
        })
        const ids = idsArg(args, "trackIds", { min: 0, max: MAX_TRACKS })
        const tracks = await existingTracks(ports, ids, context)
        const input: JsonObject = { name, trackIds: ids, ...(description ? { description } : {}) }
        const filled =
          tracks.length > 0 ? ` gồm ${tracks.length} bài: ${titles(tracks)}` : " (để trống)"
        return { input, summary: `Tạo playlist “${name}”${filled}` }
      },
      async execute({ userId }, input) {
        const name = textArg(input, "name", { max: PLAYLIST_NAME_MAX })!
        const description = textArg(input, "description", {
          max: PLAYLIST_DESCRIPTION_MAX,
          optional: true,
        })
        const ids = idsArg(input, "trackIds", { min: 0, max: MAX_TRACKS })
        const created = await ports.createPlaylist(userId, name, description, ids)
        return {
          result: {
            kind: "playlist_created",
            id: created.id,
            name: created.name,
            tracksAdded: created.added,
          },
          display: { playlists: [created.id] },
        }
      },
    },
    {
      name: "add_tracks_to_playlist",
      kind: "write",
      description:
        "Propose adding tracks to one of the user's OWN playlists (find its id with get_my_library). " +
        "The user must agree first.",
      parameters: {
        type: "object",
        properties: {
          playlistId: { type: "string", description: "Id of one of the user's playlists" },
          trackIds: trackIdsParameter(true),
        },
        required: ["playlistId", "trackIds"],
      },
      async propose(context, args) {
        const playlistId = textArg(args, "playlistId", { max: 100 })!
        const ids = idsArg(args, "trackIds", { min: 1, max: MAX_TRACKS })
        const playlist = await ports.myPlaylist(context.userId, playlistId)
        if (!playlist) throw new ToolInputError("That is not one of the user's own playlists")
        const tracks = await existingTracks(ports, ids, context)
        return {
          input: { playlistId, trackIds: ids },
          summary: `Thêm ${tracks.length} bài vào playlist “${playlist.name}”: ${titles(tracks)}`,
        }
      },
      async execute({ userId }, input) {
        const playlistId = textArg(input, "playlistId", { max: 100 })!
        const ids = idsArg(input, "trackIds", { min: 1, max: MAX_TRACKS })
        const done = await ports.addTracks(userId, playlistId, ids)
        return {
          result: { kind: "tracks_added", playlist: done.name, tracksAdded: done.added },
          display: { playlists: [playlistId] },
        }
      },
    },
    {
      name: "like_tracks",
      kind: "write",
      description: "Propose liking tracks for the user. The user must agree first.",
      parameters: {
        type: "object",
        properties: { trackIds: trackIdsParameter(true) },
        required: ["trackIds"],
      },
      async propose(context, args) {
        const ids = idsArg(args, "trackIds", { min: 1, max: MAX_TRACKS })
        const tracks = await existingTracks(ports, ids, context)
        return {
          input: { trackIds: ids },
          summary: `Thích ${tracks.length} bài hát: ${titles(tracks)}`,
        }
      },
      async execute({ userId }, input) {
        const ids = idsArg(input, "trackIds", { min: 1, max: MAX_TRACKS })
        await ports.likeTracks(userId, ids)
        return {
          result: { kind: "liked", count: ids.length },
          display: { tracks: ids.slice(0, 10) },
        }
      },
    },
    {
      name: "follow_artist",
      kind: "write",
      description: "Propose following an artist for the user. The user must agree first.",
      parameters: {
        type: "object",
        properties: {
          artistId: { type: "string", description: "Id of the artist, from a search" },
        },
        required: ["artistId"],
      },
      async propose({ userId }, args) {
        const artistId = textArg(args, "artistId", { max: 100 })!
        const found = await ports.getArtist(artistId, userId)
        if (!found) throw new ToolInputError("No artist with that id in the catalog")
        return { input: { artistId }, summary: `Theo dõi nghệ sĩ “${found.artist.name}”` }
      },
      async execute({ userId }, input) {
        const artistId = textArg(input, "artistId", { max: 100 })!
        await ports.followArtist(userId, artistId)
        return { result: { kind: "followed", artistId }, display: { artists: [artistId] } }
      },
    },
  ]
}

/** `play_tracks` and the four tools that need approval. */
export function actionTools(ports: ToolPorts): (ImmediateTool | WriteTool)[] {
  return [playTool(ports), ...writeTools(ports)]
}
