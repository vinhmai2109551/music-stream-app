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
} as const

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

    const text = question.includes(FAKE_TRIGGERS.empty) ? "" : `Bạn nói: ${question}`
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
