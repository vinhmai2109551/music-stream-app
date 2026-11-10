import type { LlmTool } from "../../../shared/llm/llm-client.js"
import type { AlbumView } from "../../albums/index.js"
import type { ArtistView } from "../../artists/index.js"
import type { PlaylistView } from "../../playlists/index.js"
import type { TrackView } from "../../tracks/index.js"
import { actionTools } from "./action-tools.js"
import { catalogTools } from "./catalog-tools.js"
import { libraryTools } from "./library-tools.js"
import type { ToolPorts } from "./ports.js"
import {
  ToolInputError,
  type AssistantTool,
  type DisplayRefs,
  type Proposal,
  type ToolContext,
  type ToolResult,
  type WriteTool,
} from "./tool.js"
import type { JsonObject } from "../../../shared/llm/llm-client.js"

/** The cards of a result, ready for the app: only the kinds that the result is about. */
export interface ToolDisplay {
  tracks?: TrackView[]
  artists?: ArtistView[]
  albums?: AlbumView[]
  playlists?: PlaylistView[]
  sources?: { source: string; heading: string }[]
}

/** What a tool call gave back, in the form that is sent to the model and kept in the conversation. */
export interface ToolOutcome {
  ok: boolean
  /** What the model reads. */
  result: unknown
  display?: DisplayRefs
  clientAction?: ToolResult["clientAction"]
}

/** What `guard` gives: the outcome, and the error when it was not one the tool meant to report. */
export interface GuardResult {
  outcome: ToolOutcome
  unexpected?: unknown
}

/** The message of a tool that did not work, as the model reads it. */
export const failed = (message: string): ToolOutcome => ({ ok: false, result: { error: message } })

/** Every tool the assistant has, found by name. */
export class ToolRegistry {
  private readonly byName: Map<string, AssistantTool>

  constructor(
    readonly tools: readonly AssistantTool[],
    private readonly ports: ToolPorts,
  ) {
    this.byName = new Map(tools.map((tool) => [tool.name, tool]))
  }

  static create(ports: ToolPorts): ToolRegistry {
    return new ToolRegistry(
      [...catalogTools(ports), ...libraryTools(ports), ...actionTools(ports)],
      ports,
    )
  }

  get(name: string): AssistantTool | undefined {
    return this.byName.get(name)
  }

  /** The tools as the model is told about them. */
  declarations(): LlmTool[] {
    return this.tools.map(({ name, description, parameters }) => ({
      name,
      description,
      parameters,
    }))
  }

  /**
   * Runs `fn` and turns what a tool refuses into a result the model can read. Anything else is a
   * real failure (the database, a bug): it is logged by the caller and the model is only told that
   * the tool did not work, never why.
   */
  async guard(
    fn: () => Promise<ToolResult>,
  ): Promise<{ outcome: ToolOutcome; unexpected?: unknown }> {
    try {
      const { result, display, clientAction } = await fn()
      return { outcome: { ok: true, result, display, clientAction } }
    } catch (error) {
      if (error instanceof ToolInputError) return { outcome: failed(error.message) }
      return {
        outcome: failed("The tool did not work. Do not try it again; tell the user."),
        unexpected: error,
      }
    }
  }

  /** Runs an immediate tool (a read, or an action for the app). */
  runImmediate(name: string, context: ToolContext, args: JsonObject): Promise<GuardResult> {
    const tool = this.get(name)
    if (!tool || tool.kind === "write") {
      return Promise.resolve({ outcome: failed(`There is no tool called "${name}"`) })
    }
    return this.guard(() => tool.run(context, args))
  }

  /**
   * Checks a proposed change and writes the sentence that the person approves. What the tool
   * refuses comes back as an outcome for the model, like for any tool.
   */
  async propose(
    tool: WriteTool,
    context: ToolContext,
    args: JsonObject,
  ): Promise<{ proposal: Proposal } | { outcome: ToolOutcome; unexpected?: unknown }> {
    try {
      return { proposal: await tool.propose(context, args) }
    } catch (error) {
      if (error instanceof ToolInputError) return { outcome: failed(error.message) }
      return {
        outcome: failed("The tool did not work. Do not try it again; tell the user."),
        unexpected: error,
      }
    }
  }

  /** Carries out a change that the person approved (the arguments are checked again). */
  executeApproved(name: string, context: ToolContext, input: JsonObject): Promise<GuardResult> {
    const tool = this.get(name)
    if (!tool || tool.kind !== "write") {
      return Promise.resolve({ outcome: failed(`There is no tool called "${name}"`) })
    }
    return this.guard(() => tool.execute(context, input))
  }

  /** The cards for `refs`, looked up fresh (a track the user liked since shows as liked). */
  async hydrate(refs: DisplayRefs | undefined, userId: string): Promise<ToolDisplay | undefined> {
    if (!refs) return undefined
    const [tracks, artists, albums, playlists] = await Promise.all([
      refs.tracks?.length ? this.ports.tracksByIds(refs.tracks, userId) : [],
      refs.artists?.length ? this.ports.artistsByIds(refs.artists, userId) : [],
      refs.albums?.length ? this.ports.albumsByIds(refs.albums, userId) : [],
      refs.playlists?.length ? this.ports.playlistsByIds(refs.playlists, userId) : [],
    ])
    const display: ToolDisplay = {
      ...(tracks.length ? { tracks } : {}),
      ...(artists.length ? { artists } : {}),
      ...(albums.length ? { albums } : {}),
      ...(playlists.length ? { playlists } : {}),
      ...(refs.sources?.length ? { sources: refs.sources } : {}),
    }
    return Object.keys(display).length > 0 ? display : undefined
  }
}
