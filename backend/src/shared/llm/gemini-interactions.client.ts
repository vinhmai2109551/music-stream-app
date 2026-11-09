import { Logger } from "@nestjs/common"
import {
  LlmRateLimitedError,
  LlmRequestError,
  LlmUnavailableError,
  type JsonObject,
  type LlmClient,
  type LlmFinish,
  type LlmMessage,
  type LlmPart,
  type LlmRequest,
  type LlmResponse,
  type LlmStreamEvent,
  type LlmUsage,
} from "./llm-client.js"
import type { ThinkingLevel } from "./llm-config.js"
import { StepAssembler } from "./gemini-stream.js"
import { readSse } from "./sse.js"

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions"
/** The revision of the Interactions API the code is written against (the one in Google's examples). */
const API_REVISION = "2026-05-20"
const REQUEST_TIMEOUT_MS = 60_000
const RATE_LIMIT_DELAY_MS = 2000
const RATE_LIMIT_DELAY_MAX_MS = 10_000
const SERVER_ERROR_DELAY_MS = 1000
const ERROR_MESSAGE_MAX = 300
/** Tries in all for one `generate`: the first and one more. */
const ATTEMPTS = 2

export const GEMINI_PROVIDER = "gemini"

export interface GeminiClientOptions {
  apiKey: string
  model: string
  thinkingLevel?: ThinkingLevel | null
  /** Replaceable so tests need no network. */
  fetchFn?: typeof fetch
  /** Replaceable so tests need not wait. */
  sleep?: (ms: number) => Promise<void>
}

const isRecord = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const numberOf = (value: unknown): number => (typeof value === "number" ? value : 0)

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

// -------------------------------------------------------------------- messages -> steps

const textContent = (text: string): JsonObject => ({ type: "text", text })

/** The `result` of a function_result step: the documented `{ content: [text] }` form. */
function resultContent(result: unknown): JsonObject {
  const text = typeof result === "string" ? result : (JSON.stringify(result) ?? "null")
  return { content: [textContent(text)] }
}

/**
 * Our messages as the steps the Interactions API takes. The API keeps no state here (`store:
 * false`), so the whole conversation goes in every time - the reasoning steps of the model
 * included, exactly as they were received.
 */
export function toSteps(messages: readonly LlmMessage[]): JsonObject[] {
  const steps: JsonObject[] = []
  for (const message of messages) {
    const stepType = message.role === "user" ? "user_input" : "model_output"
    let texts: JsonObject[] = []
    const flushText = () => {
      if (texts.length > 0) steps.push({ type: stepType, content: texts })
      texts = []
    }
    for (const part of message.parts) {
      if (part.type === "text") {
        texts.push(textContent(part.text))
        continue
      }
      flushText()
      if (part.type === "tool_call") {
        steps.push({ type: "function_call", id: part.id, name: part.name, arguments: part.args })
      } else if (part.type === "tool_result") {
        steps.push({
          type: "function_result",
          name: part.name,
          call_id: part.callId,
          result: resultContent(part.result),
          ...(part.isError ? { is_error: true } : {}),
        })
      } else if (part.provider === GEMINI_PROVIDER) {
        steps.push(part.data)
      }
      // An opaque part of another provider means nothing to Gemini: it is left out.
    }
    flushText()
  }
  return steps
}

// -------------------------------------------------------------------- steps -> message

function argumentsOf(value: unknown): JsonObject {
  if (isRecord(value)) return value
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed: unknown = JSON.parse(value)
      if (isRecord(parsed)) return parsed
    } catch {
      // Not JSON: the model sent something the tool will reject; an empty call says so.
    }
  }
  return {}
}

/** The steps the model produced as the parts of one assistant message, in order. */
export function fromSteps(steps: readonly unknown[]): LlmPart[] {
  const parts: LlmPart[] = []
  for (const step of steps) {
    if (!isRecord(step)) continue
    switch (step["type"]) {
      case "model_output": {
        const content = Array.isArray(step["content"]) ? step["content"] : []
        for (const item of content) {
          if (isRecord(item) && item["type"] === "text" && typeof item["text"] === "string") {
            parts.push({ type: "text", text: item["text"] })
          }
        }
        break
      }
      case "function_call":
        parts.push({
          type: "tool_call",
          id: typeof step["id"] === "string" ? step["id"] : `call_${parts.length}`,
          name: typeof step["name"] === "string" ? step["name"] : "",
          args: argumentsOf(step["arguments"]),
        })
        break
      case "user_input":
      case "function_result":
        // Our own steps coming back: not the model's.
        break
      default:
        // Reasoning ("thought") and anything newer: kept as received, given back as received.
        parts.push({ type: "opaque", provider: GEMINI_PROVIDER, data: step })
    }
  }
  return parts
}

function usageOf(raw: unknown): LlmUsage {
  const usage = isRecord(raw) ? raw : {}
  return {
    inputTokens: numberOf(usage["total_input_tokens"]),
    outputTokens: numberOf(usage["total_output_tokens"]),
    thoughtTokens: numberOf(usage["total_thought_tokens"]),
    totalTokens: numberOf(usage["total_tokens"]),
  }
}

function finishOf(status: unknown, parts: readonly LlmPart[]): LlmFinish {
  if (status === "incomplete") return "length"
  if (status === "requires_action" || parts.some((part) => part.type === "tool_call")) {
    return "tool_calls"
  }
  return "stop"
}

// ---------------------------------------------------------------------- the client

type Outcome =
  | { kind: "ok"; response: Response }
  | { kind: "error"; error: Error; retryable: boolean; delayMs: number }

/**
 * Gemini through the Interactions API (`POST /v1beta/interactions`), which Google recommends for
 * new projects. Every call is stateless: the conversation goes in whole, nothing is stored there.
 *
 * A rate limit (429) or a failure on Google's side (5xx, no answer) is tried once more after a
 * short wait; if that fails too the error is `LlmRateLimitedError` / `LlmUnavailableError`, which
 * the caller turns into a friendly message. The API key never appears in an error or a log line.
 */
export class GeminiInteractionsClient implements LlmClient {
  readonly provider = GEMINI_PROVIDER
  private readonly logger = new Logger(GeminiInteractionsClient.name)
  private readonly fetchFn: typeof fetch
  private readonly sleep: (ms: number) => Promise<void>

  constructor(private readonly options: GeminiClientOptions) {
    this.fetchFn = options.fetchFn ?? ((input, init) => fetch(input, init))
    this.sleep = options.sleep ?? wait
  }

  get model(): string {
    return this.options.model
  }

  /** The JSON body of the request (exposed so tests can see exactly what is sent). */
  buildBody(request: LlmRequest, stream = false): JsonObject {
    const { thinkingLevel } = this.options
    return {
      model: this.options.model,
      store: false,
      ...(stream ? { stream: true } : {}),
      ...(request.system ? { system_instruction: request.system } : {}),
      ...(request.tools && request.tools.length > 0
        ? {
            tools: request.tools.map((tool) => ({
              type: "function",
              name: tool.name,
              description: tool.description,
              parameters: tool.parameters,
            })),
          }
        : {}),
      // No temperature / top_p / top_k: the newer Gemini models ignore them, and will refuse them.
      generation_config: {
        max_output_tokens: request.maxOutputTokens,
        ...(thinkingLevel ? { thinking_level: thinkingLevel } : {}),
      },
      input: toSteps(request.messages),
    }
  }

  async generate(request: LlmRequest): Promise<LlmResponse> {
    const body = JSON.stringify(this.buildBody(request))
    const { response, requests } = await this.sendWithRetry(body, request.signal)
    return this.parse(await response.json().catch(() => null), requests)
  }

  async *stream(request: LlmRequest): AsyncGenerator<LlmStreamEvent, void> {
    const body = JSON.stringify(this.buildBody(request, true))
    // Only the start of the answer is retried: once text was sent on, there is no taking it back.
    const { response, requests } = await this.sendWithRetry(body, request.signal, true)
    if (!response.body)
      throw new LlmUnavailableError("Gemini sent an answer that could not be read")

    const assembler = new StepAssembler()
    try {
      for await (const message of readSse(response.body)) {
        if (message.data === "[DONE]") break
        let event: unknown
        try {
          event = JSON.parse(message.data)
        } catch {
          continue // not JSON: nothing to learn from it
        }
        const text = assembler.feed(event)
        if (text) yield { type: "text_delta", text }
      }
    } catch (error) {
      if (request.signal?.aborted) throw error
      if (error instanceof LlmUnavailableError) throw error
      throw new LlmUnavailableError("The answer from Gemini was cut off")
    }
    // A connection that closes without saying the answer is complete has cut it off.
    if (!assembler.completed) throw new LlmUnavailableError("The answer from Gemini was cut off")
    const { steps, status, usage } = assembler.result()
    yield { type: "done", response: this.parse({ steps, status, usage }, requests) }
  }

  /** Sends the request; a 429, a 5xx or no answer is tried once more after a short wait. */
  private async sendWithRetry(
    body: string,
    signal: AbortSignal | undefined,
    streaming = false,
  ): Promise<{ response: Response; requests: number }> {
    for (let attempt = 1; ; attempt += 1) {
      const outcome = await this.send(body, signal, streaming)
      if (outcome.kind === "ok") return { response: outcome.response, requests: attempt }
      if (!outcome.retryable || attempt >= ATTEMPTS) throw outcome.error
      this.logger.warn(`${outcome.error.message}; trying again in ${outcome.delayMs} ms`)
      await this.sleep(outcome.delayMs)
    }
  }

  private async send(
    body: string,
    signal: AbortSignal | undefined,
    streaming: boolean,
  ): Promise<Outcome> {
    // A whole request must end in time. A stream may last longer than that while it writes: only
    // the wait for it to begin is limited here, and the caller limits the rest with its signal.
    const own = new AbortController()
    const timer = setTimeout(
      () => own.abort(new Error("Gemini did not answer in time")),
      REQUEST_TIMEOUT_MS,
    )
    const timeout = streaming ? own.signal : AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    let response: Response
    try {
      response = await this.fetchFn(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.options.apiKey,
          "Api-Revision": API_REVISION,
        },
        body,
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      })
    } catch (error) {
      // The caller gave up (the person closed the chat): not a failure to retry or to report.
      if (signal?.aborted) throw error
      clearTimeout(timer)
      return {
        kind: "error",
        error: new LlmUnavailableError("Gemini could not be reached"),
        retryable: true,
        delayMs: SERVER_ERROR_DELAY_MS,
      }
    }

    clearTimeout(timer)
    if (response.ok) return { kind: "ok", response }

    const detail = await this.describe(response)
    if (response.status === 429) {
      return {
        kind: "error",
        error: new LlmRateLimitedError(`Gemini answered 429${detail}`),
        retryable: true,
        delayMs: this.retryAfterMs(response),
      }
    }
    if (response.status >= 500) {
      return {
        kind: "error",
        error: new LlmUnavailableError(`Gemini answered ${response.status}${detail}`),
        retryable: true,
        delayMs: SERVER_ERROR_DELAY_MS,
      }
    }
    return {
      kind: "error",
      error: new LlmRequestError(`Gemini answered ${response.status}${detail}`, response.status),
      retryable: false,
      delayMs: 0,
    }
  }

  /** How long to wait after a 429: the server's `Retry-After` if it sends one, within reason. */
  private retryAfterMs(response: Response): number {
    const seconds = Number(response.headers.get("retry-after"))
    if (!Number.isFinite(seconds) || seconds <= 0) return RATE_LIMIT_DELAY_MS
    return Math.min(seconds * 1000, RATE_LIMIT_DELAY_MAX_MS)
  }

  /** `: <message>` from an error body, short; empty when there is none. */
  private async describe(response: Response): Promise<string> {
    const body: unknown = await response.json().catch(() => null)
    const error = isRecord(body) && isRecord(body["error"]) ? body["error"] : null
    const message = error && typeof error["message"] === "string" ? error["message"] : ""
    // Whatever the provider says, the key is not repeated in our errors or logs.
    const safe = message.split(this.options.apiKey).join("[key]")
    return safe ? `: ${safe.slice(0, ERROR_MESSAGE_MAX)}` : ""
  }

  private parse(body: unknown, requests: number): LlmResponse {
    if (!isRecord(body) || !Array.isArray(body["steps"])) {
      throw new LlmUnavailableError("Gemini sent an answer that could not be read")
    }
    const status = body["status"]
    if (status === "failed" || status === "cancelled") {
      throw new LlmUnavailableError(`Gemini could not finish the answer (${String(status)})`)
    }
    const parts = fromSteps(body["steps"])
    const usage = usageOf(body["usage"])
    this.logger.log(
      `${this.options.model} request ${requests}: ${usage.inputTokens} in, ` +
        `${usage.outputTokens} out, ${usage.thoughtTokens} thinking`,
    )
    return {
      message: { role: "assistant", parts },
      finish: finishOf(status, parts),
      usage,
      requests,
    }
  }
}
