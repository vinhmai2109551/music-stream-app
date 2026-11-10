import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import { Logger } from "@nestjs/common"
import { GeminiInteractionsClient } from "./gemini-interactions.client.js"
import {
  LlmRateLimitedError,
  LlmRequestError,
  LlmUnavailableError,
  textOf,
  toolCallsOf,
  type LlmMessage,
  type LlmResponse,
  type LlmStreamEvent,
} from "./llm-client.js"

const KEY = "AIza-secret-key-that-must-never-leak"

const user = (text: string): LlmMessage => ({ role: "user", parts: [{ type: "text", text }] })
const request = { messages: [user("hi")], maxOutputTokens: 100 }

const answer = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers })

/** A streamed answer; `chunkSize` bytes arrive at a time. */
const sse = (events: { event: string; data: unknown }[], chunkSize = 40) => {
  const text = events
    .map(
      ({ event, data }) =>
        `event: ${event}\ndata: ${typeof data === "string" ? data : JSON.stringify(data)}\n\n`,
    )
    .join("")
  const bytes = new TextEncoder().encode(text)
  let at = 0
  return new Response(
    new ReadableStream<Uint8Array>({
      pull(controller) {
        if (at >= bytes.length) return controller.close()
        controller.enqueue(bytes.slice(at, at + chunkSize))
        at += chunkSize
      },
    }),
    { status: 200, headers: { "Content-Type": "text/event-stream" } },
  )
}

const step = (event: string, data: Record<string, unknown>) => ({
  event,
  data: { ...data, event_type: event },
})
const DONE = { event: "done", data: "[DONE]" }

/** A thought, then text in three pieces: as captured from the real API. */
const textEvents = [
  step("step.start", { index: 0, step: { type: "thought" } }),
  step("step.delta", { index: 0, delta: { type: "thought_signature", signature: "SIG" } }),
  step("step.stop", { index: 0 }),
  step("step.start", { index: 1, step: { type: "model_output" } }),
  step("step.delta", { index: 1, delta: { type: "text", text: "Xin " } }),
  step("step.delta", { index: 1, delta: { type: "text", text: "chào " } }),
  step("step.delta", { index: 1, delta: { type: "text", text: "bạn" } }),
  step("step.stop", { index: 1 }),
  step("interaction.completed", {
    interaction: {
      status: "completed",
      usage: { total_input_tokens: 25, total_output_tokens: 9, total_tokens: 34 },
    },
  }),
  DONE,
]

function setup(responses: (Response | Error)[]) {
  const sleeps: number[] = []
  const fetchFn = jest.fn<typeof fetch>(async () => {
    const next = responses.shift()
    if (!next) throw new Error("no more answers")
    if (next instanceof Error) throw next
    return next
  })
  const client = new GeminiInteractionsClient({
    apiKey: KEY,
    model: "gemini-3.5-flash-lite",
    fetchFn,
    sleep: async (ms) => void sleeps.push(ms),
  })
  const sent = () => ({
    init: fetchFn.mock.calls[0][1] as RequestInit,
    body: JSON.parse(fetchFn.mock.calls[0][1]?.body as string) as Record<string, unknown>,
  })
  return { client, fetchFn, sent, sleeps }
}

async function collect(stream: AsyncGenerator<LlmStreamEvent>): Promise<LlmStreamEvent[]> {
  const events: LlmStreamEvent[] = []
  for await (const event of stream) events.push(event)
  return events
}

const doneOf = (events: LlmStreamEvent[]): LlmResponse => {
  const last = events[events.length - 1]
  if (last.type !== "done") throw new Error("the stream did not end with done")
  return last.response
}

beforeEach(() => {
  jest.restoreAllMocks()
  jest.spyOn(Logger.prototype, "log").mockImplementation(() => undefined)
  jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined)
})

describe("GeminiInteractionsClient.stream", () => {
  it("sends the text as it comes, then the whole response", async () => {
    const { client } = setup([sse(textEvents)])

    const events = await collect(client.stream(request))

    expect(events.map((event) => event.type)).toEqual([
      "text_delta",
      "text_delta",
      "text_delta",
      "done",
    ])
    expect(events.flatMap((event) => (event.type === "text_delta" ? [event.text] : []))).toEqual([
      "Xin ",
      "chào ",
      "bạn",
    ])
    const response = doneOf(events)
    expect(textOf(response.message)).toBe("Xin chào bạn")
    expect(response.finish).toBe("stop")
    expect(response.usage).toMatchObject({ inputTokens: 25, outputTokens: 9, totalTokens: 34 })
    expect(response.requests).toBe(1)
  })

  it("asks for a stream, with the same body as generate otherwise", async () => {
    const { client, sent } = setup([sse(textEvents)])
    const full = { system: "s", ...request }

    await collect(client.stream(full))

    expect(sent().body).toEqual({ ...client.buildBody(full), stream: true })
    expect(sent().init.headers).toMatchObject({ "x-goog-api-key": KEY })
  })

  it("keeps the reasoning of the model so that it can be sent back unchanged", async () => {
    const { client } = setup([sse(textEvents)])

    const response = doneOf(await collect(client.stream(request)))

    expect(response.message.parts[0]).toEqual({
      type: "opaque",
      provider: "gemini",
      data: { type: "thought", signature: "SIG" },
    })
  })

  it("assembles a tool call and says that the model wants tools run", async () => {
    const { client } = setup([
      sse([
        step("step.start", {
          index: 0,
          step: { id: "c1", type: "function_call", name: "search_catalog", arguments: {} },
        }),
        step("step.delta", {
          index: 0,
          delta: { type: "arguments_delta", arguments: '{"query":"nhạc buồn"}' },
        }),
        step("step.stop", { index: 0 }),
        step("interaction.completed", { interaction: { status: "requires_action", usage: {} } }),
        DONE,
      ]),
    ])

    const events = await collect(client.stream(request))
    const response = doneOf(events)

    expect(events.map((event) => event.type)).toEqual(["done"])
    expect(response.finish).toBe("tool_calls")
    expect(toolCallsOf(response.message)).toEqual([
      { type: "tool_call", id: "c1", name: "search_catalog", args: { query: "nhạc buồn" } },
    ])
  })

  it("works when the network cuts the events into tiny pieces", async () => {
    const { client } = setup([sse(textEvents, 3)])

    const events = await collect(client.stream(request))

    expect(events.filter((event) => event.type === "text_delta")).toHaveLength(3)
    expect(textOf(doneOf(events).message)).toBe("Xin chào bạn")
  })

  it("tries the start again after a 429 and says how many requests it took", async () => {
    const { client, sleeps } = setup([answer({}, 429, { "retry-after": "3" }), sse(textEvents)])

    const response = doneOf(await collect(client.stream(request)))

    expect(response.requests).toBe(2)
    expect(sleeps).toEqual([3000])
  })

  it("gives LlmRateLimitedError when the retry is limited too", async () => {
    const { client } = setup([answer({}, 429), answer({}, 429)])

    await expect(collect(client.stream(request))).rejects.toBeInstanceOf(LlmRateLimitedError)
  })

  it("does not retry a refusal", async () => {
    const { client, fetchFn } = setup([answer({ error: { message: "bad" } }, 400)])

    await expect(collect(client.stream(request))).rejects.toBeInstanceOf(LlmRequestError)
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it("does not retry after text was sent: it throws LlmUnavailableError", async () => {
    const { client, fetchFn } = setup([
      sse([
        step("step.start", { index: 0, step: { type: "model_output" } }),
        step("step.delta", { index: 0, delta: { type: "text", text: "Xin " } }),
        step("error", { error: { message: "deadline", code: "gateway_timeout" } }),
      ]),
    ])
    const seen: LlmStreamEvent[] = []

    const run = async () => {
      for await (const event of client.stream(request)) seen.push(event)
    }

    await expect(run()).rejects.toBeInstanceOf(LlmUnavailableError)
    expect(seen).toEqual([{ type: "text_delta", text: "Xin " }])
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it("never puts the key in an error", async () => {
    const { client } = setup([answer({ error: { message: `key ${KEY} is invalid` } }, 400)])

    const error = await collect(client.stream(request)).catch((e: Error) => e)

    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).not.toContain(KEY)
  })

  it("passes the cancellation of the caller on, not as a Gemini error", async () => {
    const controller = new AbortController()
    const fetchFn = jest.fn<typeof fetch>(async (_url, init) => {
      controller.abort(new Error("closed"))
      throw init?.signal?.reason
    })
    const client = new GeminiInteractionsClient({
      apiKey: KEY,
      model: "m",
      fetchFn,
      sleep: async () => undefined,
    })

    const error = await collect(client.stream({ ...request, signal: controller.signal })).catch(
      (e: Error) => e,
    )

    expect(error).toBeInstanceOf(Error)
    expect(error).not.toBeInstanceOf(LlmUnavailableError)
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })
})

describe("GeminiInteractionsClient.stream when the stream is cut", () => {
  it("throws LlmUnavailableError when the connection closes before the answer is complete", async () => {
    const { client } = setup([
      sse([
        step("step.start", { index: 0, step: { type: "model_output" } }),
        step("step.delta", { index: 0, delta: { type: "text", text: "half" } }),
        // no step.stop, no interaction.completed, no [DONE]
      ]),
    ])
    const seen: LlmStreamEvent[] = []

    const run = async () => {
      for await (const event of client.stream(request)) seen.push(event)
    }

    await expect(run()).rejects.toBeInstanceOf(LlmUnavailableError)
    expect(seen).toEqual([{ type: "text_delta", text: "half" }])
  })

  it("throws when only [DONE] came: it says nothing about the answer being complete", async () => {
    const { client } = setup([sse([DONE])])
    await expect(collect(client.stream(request))).rejects.toBeInstanceOf(LlmUnavailableError)
  })

  it("is not stopped by the time limit of an ordinary request once it has begun", async () => {
    jest.useFakeTimers()
    try {
      const { client } = setup([sse(textEvents)])
      const running = collect(client.stream(request))
      // Far longer than the 60 s that an ordinary request may take.
      await jest.advanceTimersByTimeAsync(120_000)
      expect(textOf(doneOf(await running).message)).toBe("Xin chào bạn")
    } finally {
      jest.useRealTimers()
    }
  })
})
