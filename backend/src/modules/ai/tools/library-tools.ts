import { compactPlaylist, compactTrack, compactArtist, listOf } from "./compact.js"
import { REGIONS, type ToolPorts } from "./ports.js"
import { enumArg, intArg, textArg, type ImmediateTool } from "./tool.js"

const LIMIT = { min: 1, max: 10, fallback: 6 }
/** Longest piece of a help text that goes to the model. */
const HELP_CONTENT_MAX = 600
const HELP_RESULTS = 3

/** The tools about the person: what they have, what suits them, and how the app works. */
export function libraryTools(ports: ToolPorts): ImmediateTool[] {
  return [
    {
      name: "get_my_library",
      kind: "read",
      description:
        "The user's own library: how many tracks they liked (with some of them), the artists they " +
        "follow, and their playlists with their ids. Use it to know their taste or to find the id of " +
        "one of their playlists.",
      parameters: { type: "object", properties: {} },
      async run({ userId }) {
        const { likedTracks, followedArtists, playlists } = await ports.library(userId)
        return {
          result: {
            kind: "library",
            likedTracks: listOf(likedTracks, compactTrack),
            followedArtists: listOf(followedArtists, compactArtist),
            playlists: listOf(playlists, compactPlaylist, 20),
          },
          display: { playlists: playlists.slice(0, 10).map((playlist) => playlist.id) },
        }
      },
    },
    {
      name: "recommend_tracks",
      kind: "read",
      description:
        "Tracks that fit the taste of the user, from what they liked and played. Without any history " +
        "it returns what is popular (`personal` is then false).",
      parameters: {
        type: "object",
        properties: {
          region: { type: "string", enum: [...REGIONS], description: "Only tracks of this region" },
          limit: { type: "integer", description: "How many, 1 to 10 (default 6)" },
        },
      },
      async run({ userId }, args) {
        const region = enumArg(args, "region", REGIONS)
        const { items, personal } = await ports.recommend(
          userId,
          intArg(args, "limit", LIMIT),
          region,
        )
        return {
          result: { kind: "tracks", personal, ...listOf(items, compactTrack) },
          display: { tracks: items.map((track) => track.id) },
        }
      },
    },
    {
      name: "similar_tracks",
      kind: "read",
      description: "Tracks close in style and mood to a track of the catalog.",
      parameters: {
        type: "object",
        properties: {
          trackId: { type: "string", description: "Id of the track, as returned by a search" },
          limit: { type: "integer", description: "How many, 1 to 10 (default 6)" },
        },
        required: ["trackId"],
      },
      async run({ userId }, args) {
        const trackId = textArg(args, "trackId", { max: 100 })!
        const items = await ports.similar(trackId, intArg(args, "limit", LIMIT), userId)
        return {
          result: { kind: "tracks", ...listOf(items, compactTrack) },
          display: { tracks: items.map((track) => track.id) },
        }
      },
    },
    {
      name: "search_help",
      kind: "read",
      description:
        "Look up how the app works (Premium, playing music, playlists, account, search, comments...). " +
        "Use it for any question about the app and answer only from what it returns, naming the " +
        "source (`heading`). If nothing fits, say you do not know.",
      parameters: {
        type: "object",
        properties: { question: { type: "string", description: "The question about the app" } },
        required: ["question"],
      },
      async run(_context, args) {
        const answers = await ports.help(textArg(args, "question", { max: 300 })!, HELP_RESULTS)
        return {
          result: {
            kind: "help",
            items: answers.map((answer) => ({
              source: answer.source,
              heading: answer.heading,
              content: answer.content.slice(0, HELP_CONTENT_MAX),
              score: Math.round(answer.score * 100) / 100,
            })),
          },
          display: {
            sources: answers.map((answer) => ({ source: answer.source, heading: answer.heading })),
          },
        }
      },
    },
  ]
}
