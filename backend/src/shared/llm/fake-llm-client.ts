import {
  LlmRateLimitedError,
  LlmUnavailableError,
  textOf,
  type LlmClient,
  type LlmMessage,
  type LlmRequest,
  type LlmResponse,
  type LlmStreamEvent,
} from "./llm-client.js"

/** Words a message may contain to make the fake model behave in a particular way (for tests). */
export const FAKE_TRIGGERS = {
  rateLimited: "[[rate-limit]]",
  unavailable: "[[down]]",
  empty: "[[empty]]",
  /** Never finishes by itself: waits until the request is cancelled. */
  slow: "[[slow]]",
  /** The answer is cut at the token limit. */
  long: "[[long]]",
  /** Asks for a tool in the first round: `[[call:search_catalog:{"query":"mưa"}]]` (any number). */
  callPrefix: "[[call:",
  /** Asks for a tool in every round in which tools are offered, until they are not. */
  loop: "[[loop]]",
} as const

function parseArgs(token: string, json: string): Record<string, unknown> {
  try {
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    throw new Error(`The fake model cannot read the arguments of ${token}: they are not JSON`)
  }
}

/** `[[call:name:{json}]]` */
const CALL = /\[\[call:([a-z_]+):(\{.*?\})\]\]/g

const USAGE = { inputTokens: 10, outputTokens: 10, thoughtTokens: 0, totalTokens: 20 }

/** The last thing the person wrote. */
function lastQuestion(messages: readonly LlmMessage[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message.role === "user") {
      const text = textOf(message)
      if (text) return text
    }
  }
  return ""
}

/**
 * What the tools returned in the latest round, as a sentence; null when the conversation does not
 * end with tool results.
 */
function toolReport(messages: readonly LlmMessage[]): string | null {
  const names: string[] = []
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const parts = messages[index].parts
    const results = parts.filter((part) => part.type === "tool_result")
    if (messages[index].role !== "user" || results.length === 0) break
    for (const part of results) {
      names.unshift(`${part.name}: ${part.isError ? "lỗi" : "ok"}`)
    }
  }
  return names.length > 0 ? `Kết quả công cụ: ${names.join("; ")}` : null
}

/**
 * A stand-in for the language model that echoes the question ("Bạn nói: ..."), for tests and
 * offline development: no network, no key. Particular words in the question (`FAKE_TRIGGERS`)
 * make it fail or hang the way the real one can. The settings refuse it in production.
 */
export class FakeLlmClient implements LlmClient {
  readonly provider = "fake"
  readonly model = "fake-model"
  /** Every request received, oldest first. */
  readonly requests: LlmRequest[] = []

  async generate(request: LlmRequest): Promise<LlmResponse> {
    let response: LlmResponse | null = null
    for await (const event of this.stream(request)) {
      if (event.type === "done") response = event.response
    }
    if (!response) throw new LlmUnavailableError("The fake model gave no answer")
    return response
  }

  private calls = 0

  /** A response that asks for tools, when the question says so and tools are offered. */
  private toolRound(
    request: LlmRequest,
    question: string,
  ): { text: string; response: LlmResponse } | null {
    if (!request.tools?.length) return null
    const afterTools = toolReport(request.messages) !== null
    const wanted = afterTools
      ? question.includes(FAKE_TRIGGERS.loop)
        ? [{ name: "search_catalog", args: { query: "x" } }]
        : []
      : [
          ...[...question.matchAll(CALL)].map((match) => ({
            name: match[1],
            args: parseArgs(match[0], match[2]),
          })),
          ...(question.includes(FAKE_TRIGGERS.loop)
            ? [{ name: "search_catalog", args: { query: "x" } }]
            : []),
        ]
    if (wanted.length === 0) return null
    const text = "Để mình xem. "
    return {
      text,
      response: {
        message: {
          role: "assistant",
          parts: [
            { type: "text", text },
            ...wanted.map((call) => {
              this.calls += 1
              return {
                type: "tool_call" as const,
                id: `fake_call_${this.calls}`,
                ...call,
                args: call.args,
              }
            }),
          ],
        },
        finish: "tool_calls",
        usage: USAGE,
        requests: 1,
      },
    }
  }

  async *stream(request: LlmRequest): AsyncGenerator<LlmStreamEvent, void> {
    this.requests.push(request)
    const question = lastQuestion(request.messages)
    if (question.includes(FAKE_TRIGGERS.rateLimited)) throw new LlmRateLimitedError()
    if (question.includes(FAKE_TRIGGERS.unavailable)) throw new LlmUnavailableError()
    if (question.includes(FAKE_TRIGGERS.slow)) {
      await new Promise<void>((_resolve, reject) => {
        const stop = () => reject(request.signal?.reason ?? new Error("cancelled"))
        if (request.signal?.aborted) stop()
        request.signal?.addEventListener("abort", stop, { once: true })
      })
    }

    const tooled = this.toolRound(request, question)
    if (tooled) {
      yield { type: "text_delta", text: tooled.text }
      yield { type: "done", response: tooled.response }
      return
    }

    const text = question.includes(FAKE_TRIGGERS.empty)
      ? ""
      : (toolReport(request.messages) ?? `Bạn nói: ${question}`)
    for (const word of text.match(/\S+\s*/g) ?? []) {
      if (request.signal?.aborted) throw request.signal.reason
      yield { type: "text_delta", text: word }
    }
    yield {
      type: "done",
      response: {
        message: { role: "assistant", parts: text ? [{ type: "text", text }] : [] },
        finish: question.includes(FAKE_TRIGGERS.long) ? "length" : "stop",
        usage: USAGE,
        requests: 1,
      },
    }
  }
}
