import { Injectable } from "@nestjs/common"
import { textOf } from "../../shared/llm/llm-client.js"
import { ActionsService, type ActionStatus } from "./actions.service.js"
import { ConversationsService } from "./conversations.service.js"
import { ToolRegistry, type ToolDisplay } from "./tools/registry.js"
import type { DisplayRefs } from "./tools/tool.js"
import type { StoredToolResult } from "./tools/tool-message.js"

/** Cards looked up when a conversation is opened: the latest ones; older ones show as plain lines. */
const MAX_CARD_LINES = 100

/** One line of a conversation as the app shows it. */
export interface AiMessageView {
  id: string
  /** `tool`: a card (tracks, artists...) or a change waiting for an answer, between the texts. */
  role: "user" | "assistant" | "tool"
  /** What was said; empty for a card. */
  text: string
  createdAt: Date
  tool?: {
    callId: string
    name: string
    /** Whether it worked; null while the person has not answered a proposed change. */
    ok: boolean | null
    display?: ToolDisplay
    /** Set for a change that needed approval. */
    action?: { id: string; status: ActionStatus; summary: string; expiresAt: Date }
  }
}

type Tool = NonNullable<AiMessageView["tool"]>
type Line = Omit<AiMessageView, "tool"> & { tool?: Omit<Tool, "display"> & { refs?: DisplayRefs } }

const merge = (lists: (string[] | undefined)[]) => [...new Set(lists.flatMap((l) => l ?? []))]

/** The ids of all the cards of `lines`, each once. */
function union(lines: readonly Line[]): DisplayRefs {
  const refs = lines.map((line) => line.tool?.refs)
  return {
    tracks: merge(refs.map((r) => r?.tracks)),
    artists: merge(refs.map((r) => r?.artists)),
    albums: merge(refs.map((r) => r?.albums)),
    playlists: merge(refs.map((r) => r?.playlists)),
  }
}

/** The part of `found` that `refs` asks for, in the order of `refs`. */
function pick(
  found: ToolDisplay | undefined,
  refs: DisplayRefs | undefined,
): ToolDisplay | undefined {
  if (!refs || !found) return refs?.sources?.length ? { sources: refs.sources } : undefined
  const by = <T extends { id: string }>(items: T[] | undefined, ids: string[] | undefined) => {
    const index = new Map((items ?? []).map((item) => [item.id, item]))
    return (ids ?? []).flatMap((id) => index.get(id) ?? [])
  }
  const display: ToolDisplay = {
    tracks: by(found.tracks, refs.tracks),
    artists: by(found.artists, refs.artists),
    albums: by(found.albums, refs.albums),
    playlists: by(found.playlists, refs.playlists),
    ...(refs.sources?.length ? { sources: refs.sources } : {}),
  }
  for (const key of ["tracks", "artists", "albums", "playlists"] as const) {
    if (display[key]?.length === 0) delete display[key]
  }
  return Object.keys(display).length > 0 ? display : undefined
}

/**
 * A conversation for the app: the texts, and between them the cards that tools showed and the
 * changes that were proposed (with what became of them). Cards are looked up again, so a track
 * liked since shows as liked; opening an old conversation never plays or changes anything.
 */
@Injectable()
export class MessagesViewService {
  constructor(
    private readonly conversations: ConversationsService,
    private readonly actions: ActionsService,
    private readonly registry: ToolRegistry,
  ) {}

  async list(userId: string, conversationId: string): Promise<AiMessageView[]> {
    const rows = await this.conversations.rawMessages(userId, conversationId)
    const actions = await this.actions.ofConversation(conversationId)

    const results = new Map<string, StoredToolResult>()
    for (const row of rows) {
      for (const part of row.parts) {
        if (part.type === "tool_result") results.set(part.callId, part as StoredToolResult)
      }
    }

    const lines: Line[] = []
    for (const row of rows) {
      const text = textOf({ role: row.role, parts: row.parts })
      if (text) lines.push({ id: row.id, role: row.role, text, createdAt: row.createdAt })

      for (const part of row.parts) {
        if (part.type === "tool_call" && this.registry.get(part.name)?.kind === "write") {
          const action = actions.get(part.id)
          if (!action) continue
          const result = results.get(part.id)
          const done = action.status === "CONFIRMED" && result !== undefined
          lines.push({
            id: `${row.id}:${part.id}`,
            role: "tool",
            text: "",
            createdAt: row.createdAt,
            tool: {
              callId: part.id,
              name: part.name,
              ok: action.status === "PENDING" ? null : done && !result.isError,
              refs: done ? result.display : undefined,
              action: {
                id: action.id,
                status: action.status,
                summary: action.summary,
                expiresAt: action.expiresAt,
              },
            },
          })
        } else if (part.type === "tool_result" && this.registry.get(part.name)?.kind !== "write") {
          const stored = part as StoredToolResult
          lines.push({
            id: `${row.id}:${part.callId}`,
            role: "tool",
            text: "",
            createdAt: row.createdAt,
            tool: { callId: part.callId, name: part.name, ok: !part.isError, refs: stored.display },
          })
        }
      }
    }

    // The cards of the latest lines are looked up together, once per id: a conversation may hold
    // hundreds of them, and the same track appears in many.
    const recent = new Set(lines.filter((line) => line.tool?.refs).slice(-MAX_CARD_LINES))
    const found = await this.registry.hydrate(union([...recent]), userId)
    return lines.map(({ tool, ...line }, index): AiMessageView => {
      if (!tool) return line
      const { refs, ...rest } = tool
      const display = recent.has(lines[index]) ? pick(found, refs) : undefined
      return { ...line, tool: { ...rest, ...(display ? { display } : {}) } }
    })
  }
}
