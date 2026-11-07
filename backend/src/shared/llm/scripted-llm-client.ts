import type { LlmClient, LlmMessage, LlmRequest, LlmResponse } from "./llm-client.js"

/** What a scripted answer may be: a ready response, a plain text, or an error to throw. */
export type ScriptedAnswer = LlmResponse | string | Error

const EMPTY_USAGE = { inputTokens: 1, outputTokens: 1, thoughtTokens: 0, totalTokens: 2 }

const assistant = (message: LlmMessage): LlmResponse => ({
  message,
  finish: message.parts.some((part) => part.type === "tool_call") ? "tool_calls" : "stop",
  usage: EMPTY_USAGE,
  requests: 1,
})

/**
 * A language model for tests: it answers with what the script says, in order, and remembers every
 * request it got. It never touches the network. Not for production use.
 */
export class ScriptedLlmClient implements LlmClient {
  readonly provider = "scripted"
  readonly model = "scripted-model"
  /** Every request received, oldest first. */
  readonly requests: LlmRequest[] = []
  private next = 0

  constructor(private readonly script: readonly ScriptedAnswer[]) {}

  generate(request: LlmRequest): Promise<LlmResponse> {
    this.requests.push(request)
    const answer = this.script[this.next]
    this.next += 1
    if (answer === undefined) {
      return Promise.reject(new Error("The script of the fake language model ran out"))
    }
    if (answer instanceof Error) return Promise.reject(answer)
    if (typeof answer === "string") {
      return Promise.resolve(
        assistant({ role: "assistant", parts: [{ type: "text", text: answer }] }),
      )
    }
    return Promise.resolve(answer)
  }
}

/** A response that asks for tools to be run (and may say something first). */
export function toolCallResponse(
  calls: readonly { id: string; name: string; args?: Record<string, unknown> }[],
  text?: string,
): LlmResponse {
  return assistant({
    role: "assistant",
    parts: [
      ...(text ? [{ type: "text" as const, text }] : []),
      ...calls.map((call) => ({
        type: "tool_call" as const,
        id: call.id,
        name: call.name,
        args: call.args ?? {},
      })),
    ],
  })
}
