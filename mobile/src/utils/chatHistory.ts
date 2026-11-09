import type { AssistantActionStatus, AssistantMessageLine } from "@/api/types"
import type { ChatItem } from "./chatTypes"

/** The conversation as the server kept it, as items. */
export function itemsFromHistory(lines: AssistantMessageLine[], now: number): ChatItem[] {
  return lines.map((line): ChatItem => {
    if (line.role === "user") return { kind: "user", id: line.id, text: line.text, failed: false }
    if (line.role === "assistant") {
      return { kind: "assistant", id: line.id, text: line.text, streaming: false, truncated: false }
    }
    const tool = line.tool
    if (tool?.action) {
      const { action } = tool
      const lapsed = action.status === "PENDING" && new Date(action.expiresAt).getTime() <= now
      const status: AssistantActionStatus | "FAILED" = lapsed
        ? "EXPIRED"
        : action.status === "CONFIRMED" && tool.ok === false
          ? "FAILED"
          : action.status
      return {
        kind: "action",
        id: line.id,
        actionId: action.id,
        callId: tool.callId,
        tool: tool.name,
        summary: action.summary,
        expiresAt: action.expiresAt,
        status,
        display: tool.display,
      }
    }
    return {
      kind: "tool",
      id: line.id,
      callId: tool?.callId ?? line.id,
      name: tool?.name ?? "",
      status: tool?.ok === false ? "failed" : "done",
      display: tool?.display,
    }
  })
}
