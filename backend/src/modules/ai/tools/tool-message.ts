import type { LlmPart } from "../../../shared/llm/llm-client.js"
import type { DisplayRefs } from "./tool.js"
import type { ToolOutcome } from "./registry.js"

/**
 * A stored `tool_result`: the part the model reads, plus the cards (`display`) the app shows. The
 * extra field is ignored when the part is sent to the model.
 */
export type StoredToolResult = Extract<LlmPart, { type: "tool_result" }> & { display?: DisplayRefs }

export function toolResultPart(
  callId: string,
  name: string,
  outcome: ToolOutcome,
): StoredToolResult {
  return {
    type: "tool_result",
    callId,
    name,
    result: outcome.result,
    ...(outcome.ok ? {} : { isError: true }),
    ...(outcome.display ? { display: outcome.display } : {}),
  }
}

/** What the model is told about a change that the person did not approve in time. */
export const NOT_ANSWERED =
  "The user did not answer in time, so this change was NOT made. Do not say it was done."
/** What it is told when they said no. */
export const REJECTED =
  "The user said no: this change was NOT made. Do not ask again and do not propose it again; " +
  "acknowledge it briefly and move on."
/** What it is told when a change was carried out but its result did not get stored. */
export const NOT_RECORDED =
  "This change WAS carried out, but its result was not recorded. Do not do it again."
