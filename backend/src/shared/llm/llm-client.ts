/**
 * A language model as the rest of the API sees it: plain data in, plain data out. Nothing here
 * names a provider, so changing from Gemini to Claude or OpenAI means writing one adapter that
 * implements `LlmClient` - the assistant, the tools and the tests stay as they are.
 */
export type JsonObject = { [key: string]: unknown }

/** One piece of a message. */
export type LlmPart =
  | { type: "text"; text: string }
  /** The model asks for a tool to be run. `id` ties the result to the call. */
  | { type: "tool_call"; id: string; name: string; args: JsonObject }
  /** What the tool returned (sent back to the model in a message with role `user`). */
  | { type: "tool_result"; callId: string; name: string; result: unknown; isError?: boolean }
  /**
   * Something only the provider that wrote it understands, such as Gemini's reasoning steps with
   * their signatures. It must be kept as received and given back to the same adapter unchanged,
   * which is how the model keeps its train of thought across tool calls.
   */
  | { type: "opaque"; provider: string; data: JsonObject }

export interface LlmMessage {
  role: "user" | "assistant"
  parts: LlmPart[]
}

/** A tool the model may ask for. `parameters` is a JSON schema of its arguments. */
export interface LlmTool {
  name: string
  description: string
  parameters: JsonObject
}

export interface LlmRequest {
  system?: string
  messages: LlmMessage[]
  tools?: LlmTool[]
  /** Most tokens the model may produce (what it thinks counts too). */
  maxOutputTokens: number
  /** Cancels the request, e.g. when the person closed the chat. */
  signal?: AbortSignal
}

export interface LlmUsage {
  inputTokens: number
  outputTokens: number
  /** Tokens the model spent thinking; already part of what is billed. */
  thoughtTokens: number
  totalTokens: number
}

/** Why the model stopped. */
export type LlmFinish =
  /** It finished its answer. */
  | "stop"
  /** It wants tools run before it can go on. */
  | "tool_calls"
  /** It hit `maxOutputTokens`: the answer is cut off. */
  | "length"

export interface LlmResponse {
  /** What the model said and asked for, always with role `assistant`. */
  message: LlmMessage
  finish: LlmFinish
  usage: LlmUsage
  /** Calls made to the provider for this response: 2 when the first was retried. */
  requests: number
}

export interface LlmClient {
  /** The provider's name, e.g. `gemini`: the owner of the `opaque` parts it writes. */
  readonly provider: string
  /** The model's name, for logs. */
  readonly model: string
  generate(request: LlmRequest): Promise<LlmResponse>
}

/** Injection token of the language model (`LlmClient`, or null while none is configured). */
export const LLM_CLIENT = "LLM_CLIENT"

/** The provider says we ask too much (HTTP 429): the free quota or the rate limit is used up. */
export class LlmRateLimitedError extends Error {
  constructor(message = "The language model is busy") {
    super(message)
    this.name = "LlmRateLimitedError"
  }
}

/** The provider cannot be reached or has a problem of its own (HTTP 5xx, network, timeout). */
export class LlmUnavailableError extends Error {
  constructor(message = "The language model is unavailable") {
    super(message)
    this.name = "LlmUnavailableError"
  }
}

/** The provider refused the request (HTTP 4xx other than 429): a bug or a bad key, not a retry. */
export class LlmRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = "LlmRequestError"
  }
}

/** The text of a response: its text parts, in order, joined. */
export function textOf(message: LlmMessage): string {
  return message.parts.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("")
}

/** The tool calls of a response, in order. */
export function toolCallsOf(message: LlmMessage): Extract<LlmPart, { type: "tool_call" }>[] {
  return message.parts.filter(
    (part): part is Extract<LlmPart, { type: "tool_call" }> => part.type === "tool_call",
  )
}
