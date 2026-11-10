import type { AssistantDisplay, AssistantEvent } from "@/api/types"
import type { SseMessage } from "./sse"

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const isString = (value: unknown): value is string => typeof value === "string"
const isStrings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(isString)

type Kind = "string" | "number" | "strings"

/** The fields the rows of the app read. An item without them is left out, not drawn broken. */
const SHAPES = {
  tracks: { id: "string", title: "string", artist: "string", plays: "number", duration: "number" },
  artists: { id: "string", name: "string", followers: "number" },
  albums: { id: "string", title: "string", artist: "string" },
  playlists: { id: "string", name: "string", owner: "string", trackIds: "strings" },
} as const satisfies Record<string, Record<string, Kind>>

function hasShape(value: unknown, shape: Record<string, Kind>): boolean {
  if (!isRecord(value)) return false
  return Object.entries(shape).every(([key, kind]) => {
    const field = value[key]
    if (kind === "string") return isString(field)
    if (kind === "number") return typeof field === "number" && Number.isFinite(field)
    return isStrings(field)
  })
}

/** The items of a list that have the shape of `kind`. */
const only = (list: unknown[], kind: keyof typeof SHAPES) =>
  list.filter((item) => hasShape(item, SHAPES[kind]))

/** The cards of a result: the lists the server sent, with the items that cannot be drawn left out. */
function readDisplay(value: unknown): AssistantDisplay | undefined {
  if (!isRecord(value)) return undefined
  const display: AssistantDisplay = {}
  for (const key of ["tracks", "artists", "albums", "playlists"] as const) {
    const list = value[key]
    if (Array.isArray(list)) (display as Record<string, unknown>)[key] = only(list, key)
  }
  const sources = value["sources"]
  if (Array.isArray(sources)) {
    const valid = sources.filter(
      (source): source is { source: string; heading: string } =>
        isRecord(source) && isString(source["source"]) && isString(source["heading"]),
    )
    if (valid.length > 0) display.sources = valid
  }
  return Object.keys(display).length > 0 ? display : undefined
}

/**
 * One event of the stream as the app understands it, or null for an event it does not know or
 * cannot read (a newer server may send more kinds; a broken one must not break the chat).
 */
export function parseAssistantEvent(message: SseMessage): AssistantEvent | null {
  let data: unknown
  try {
    data = JSON.parse(message.data)
  } catch {
    return null
  }
  if (!isRecord(data)) return null

  switch (message.event) {
    case "text_delta":
      return isString(data["text"]) ? { type: "text_delta", text: data["text"] } : null
    case "tool_call":
      return isString(data["callId"]) && isString(data["name"])
        ? { type: "tool_call", callId: data["callId"], name: data["name"] }
        : null
    case "tool_result": {
      if (!isString(data["callId"]) || !isString(data["name"])) return null
      const action = data["action"]
      const status = isRecord(action) ? action["status"] : undefined
      return {
        type: "tool_result",
        callId: data["callId"],
        name: data["name"],
        ok: data["ok"] === true,
        display: readDisplay(data["display"]),
        ...(isRecord(action) &&
        isString(action["id"]) &&
        (status === "CONFIRMED" || status === "REJECTED")
          ? { action: { id: action["id"], status } }
          : {}),
      }
    }
    case "action_required":
      return isString(data["actionId"]) &&
        isString(data["callId"]) &&
        isString(data["tool"]) &&
        isString(data["summary"]) &&
        isString(data["expiresAt"])
        ? {
            type: "action_required",
            actionId: data["actionId"],
            callId: data["callId"],
            tool: data["tool"],
            summary: data["summary"],
            expiresAt: data["expiresAt"],
          }
        : null
    case "client_action":
      return data["action"] === "play_tracks" &&
        isStrings(data["trackIds"]) &&
        Array.isArray(data["tracks"])
        ? {
            type: "client_action",
            action: "play_tracks",
            trackIds: data["trackIds"],
            tracks: only(data["tracks"], "tracks") as unknown as Extract<
              AssistantEvent,
              { type: "client_action" }
            >["tracks"],
          }
        : null
    case "done":
      return isString(data["messageId"])
        ? {
            type: "done",
            messageId: data["messageId"],
            truncated: data["truncated"] === true,
            awaitingAction: data["awaitingAction"] === true,
          }
        : null
    case "error":
      return isString(data["code"]) && isString(data["message"])
        ? { type: "error", code: data["code"], message: data["message"] }
        : null
    default:
      return null
  }
}
