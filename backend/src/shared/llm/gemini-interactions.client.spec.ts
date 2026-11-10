import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import { Logger } from "@nestjs/common"
import { GeminiInteractionsClient, fromSteps, toSteps } from "./gemini-interactions.client.js"
import {
  LlmRateLimitedError,
  LlmRequestError,
  LlmUnavailableError,
  textOf,
  toolCallsOf,
  type LlmMessage,
} from "./llm-client.js"

const KEY = "AIza-secret-key-that-must-never-leak"

const user = (text: string): LlmMessage => ({ role: "user", parts: [{ type: "text", text }] })

const answer = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers })

const completed = (steps: unknown[], usage: Record<string, number> = {}) => ({
  id: "v1_x",
  object: "interaction",
  status: "completed",
  steps,
  usage: {
    total_input_tokens: 7,
    total_output_tokens: 23,
    total_thought_tokens: 49,
    total_tokens: 79,
    ...usage,
  },
})

const textStep = (text: string) => ({ type: "model_output", content: [{ type: "text", text }] })

function setup(responses: (Response | Error)[], options: { thinkingLevel?: "low" | null } = {}) {
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
    thinkingLevel: options.thinkingLevel,
    fetchFn,
    sleep: async (ms) => void sleeps.push(ms),
  })
  const sent = (call = 0) => ({
    url: fetchFn.mock.calls[call][0] as string,
    init: fetchFn.mock.calls[call][1] as RequestInit,
    body: JSON.parse(fetchFn.mock.calls[call][1]?.body as string) as Record<string, unknown>,
  })
  return { client, fetchFn, sent, sleeps }
}

beforeEach(() => {
  jest.restoreAllMocks()
  jest.spyOn(Logger.prototype, "log").mockImplementation(() => undefined)
  jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined)
})

describe("toSteps", () => {
  it("turns user and assistant text into user_input and model_output steps", () => {
    expect(
      toSteps([
        user("Xin chào"),
        { role: "assistant", parts: [{ type: "text", text: "Chào bạn" }] },
      ]),
    ).toEqual([
      { type: "user_input", content: [{ type: "text", text: "Xin chào" }] },
      { type: "model_output", content: [{ type: "text", text: "Chào bạn" }] },
    ])
  })

  it("keeps the order of an assistant message: reasoning, text, then the tool call", () => {
    const thought = { type: "thought", signature: "sig-1" }

    const steps = toSteps([
      {
        role: "assistant",
        parts: [
          { type: "opaque", provider: "gemini", data: thought },
          { type: "text", text: "Để mình tìm." },
          { type: "tool_call", id: "call_1", name: "search_catalog", args: { query: "buồn" } },
        ],
      },
    ])

    expect(steps).toEqual([
      thought,
      { type: "model_output", content: [{ type: "text", text: "Để mình tìm." }] },
      { type: "function_call", id: "call_1", name: "search_catalog", arguments: { query: "buồn" } },
    ])
  })

  it("sends a tool result as a function_result step with the documented content form", () => {
    expect(
      toSteps([
        {
          role: "user",
          parts: [
            { type: "tool_result", callId: "call_1", name: "search_catalog", result: { total: 2 } },
            {
              type: "tool_result",
              callId: "call_2",
              name: "get_track",
              result: "plain",
              isError: true,
            },
          ],
        },
      ]),
    ).toEqual([
      {
        type: "function_result",
        name: "search_catalog",
        call_id: "call_1",
        result: { content: [{ type: "text", text: '{"total":2}' }] },
      },
      {
        type: "function_result",
        name: "get_track",
        call_id: "call_2",
        result: { content: [{ type: "text", text: "plain" }] },
        is_error: true,
      },
    ])
  })

  it("leaves out opaque parts that another provider wrote", () => {
    expect(
      toSteps([
        {
          role: "assistant",
          parts: [
            { type: "opaque", provider: "claude", data: { type: "thinking" } },
            { type: "text", text: "ok" },
          ],
        },
      ]),
    ).toEqual([{ type: "model_output", content: [{ type: "text", text: "ok" }] }])
  })

  it("groups text parts that follow each other into one step", () => {
    expect(
      toSteps([
        {
          role: "user",
          parts: [
            { type: "text", text: "a" },
            { type: "text", text: "b" },
          ],
        },
      ]),
    ).toEqual([
      {
        type: "user_input",
        content: [
          { type: "text", text: "a" },
          { type: "text", text: "b" },
        ],
      },
    ])
  })
})

describe("fromSteps", () => {
  it("reads text, function calls and keeps the reasoning as an opaque part, in order", () => {
    const thought = { type: "thought", signature: "sig-9", summary: [] }

    const parts = fromSteps([
      thought,
      textStep("Mình tìm thử nhé."),
      { type: "function_call", id: "c1", name: "get_track", arguments: { trackId: "t1" } },
    ])

    expect(parts).toEqual([
      { type: "opaque", provider: "gemini", data: thought },
      { type: "text", text: "Mình tìm thử nhé." },
      { type: "tool_call", id: "c1", name: "get_track", args: { trackId: "t1" } },
    ])
  })

  it("reads arguments that arrive as a JSON string, and survives ones that are not JSON", () => {
    const [good, bad] = fromSteps([
      { type: "function_call", id: "a", name: "x", arguments: '{"n":1}' },
      { type: "function_call", id: "b", name: "x", arguments: "not json" },
    ])

    expect(good).toMatchObject({ args: { n: 1 } })
    expect(bad).toMatchObject({ args: {} })
  })

  it("skips our own steps and things that are not steps", () => {
    expect(
      fromSteps([{ type: "user_input", content: [] }, { type: "function_result" }, null, 5, "x"]),
    ).toEqual([])
  })

  it("keeps a step type it does not know, to give it back as it came", () => {
    const step = { type: "google_search_call", id: "g1", signature: "s" }

    expect(fromSteps([step])).toEqual([{ type: "opaque", provider: "gemini", data: step }])
  })
})

describe("GeminiInteractionsClient.generate: the request", () => {
  it("posts to the Interactions endpoint with the key in a header, never in the address", async () => {
    const { client, sent } = setup([answer(completed([textStep("ok")]))])

    await client.generate({ messages: [user("hi")], maxOutputTokens: 500 })

    const { url, init } = sent()
    expect(url).toBe("https://generativelanguage.googleapis.com/v1beta/interactions")
    expect(url).not.toContain(KEY)
    expect(init.method).toBe("POST")
    expect(init.headers).toMatchObject({
      "Content-Type": "application/json",
      "x-goog-api-key": KEY,
      "Api-Revision": "2026-05-20",
    })
  })

  it("sends the model, no stored state, the instruction, the limit and the whole conversation", async () => {
    const { client, sent } = setup([answer(completed([textStep("ok")]))])

    await client.generate({
      system: "Bạn là trợ lý nhạc.",
      messages: [user("Gợi ý nhạc buồn")],
      maxOutputTokens: 1024,
    })

    expect(sent().body).toEqual({
      model: "gemini-3.5-flash-lite",
      store: false,
      system_instruction: "Bạn là trợ lý nhạc.",
      generation_config: { max_output_tokens: 1024 },
      input: [{ type: "user_input", content: [{ type: "text", text: "Gợi ý nhạc buồn" }] }],
    })
  })

  it("never sends temperature, top_p or top_k", async () => {
    const { client, sent } = setup([answer(completed([textStep("ok")]))])

    await client.generate({ messages: [user("hi")], maxOutputTokens: 10 })

    const config = JSON.stringify(sent().body)
    expect(config).not.toMatch(/temperature|top_p|top_k/)
  })

  it("declares tools in the flat form of the Interactions API", async () => {
    const { client, sent } = setup([answer(completed([textStep("ok")]))])
    const parameters = {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    }

    await client.generate({
      messages: [user("hi")],
      maxOutputTokens: 10,
      tools: [{ name: "search_catalog", description: "Find music", parameters }],
    })

    expect(sent().body["tools"]).toEqual([
      { type: "function", name: "search_catalog", description: "Find music", parameters },
    ])
  })

  it("sends no tools field when there are none", async () => {
    const { client, sent } = setup([answer(completed([textStep("ok")]))])

    await client.generate({ messages: [user("hi")], maxOutputTokens: 10, tools: [] })

    expect(sent().body).not.toHaveProperty("tools")
  })

  it("adds the thinking level when one is configured", async () => {
    const { client, sent } = setup([answer(completed([textStep("ok")]))], { thinkingLevel: "low" })

    await client.generate({ messages: [user("hi")], maxOutputTokens: 10 })

    expect(sent().body["generation_config"]).toEqual({
      max_output_tokens: 10,
      thinking_level: "low",
    })
  })
})

describe("GeminiInteractionsClient.generate: the answer", () => {
  it("returns the text, the usage and one request", async () => {
    const { client } = setup([answer(completed([textStep("Xin chào!")]))])

    const response = await client.generate({ messages: [user("hi")], maxOutputTokens: 10 })

    expect(textOf(response.message)).toBe("Xin chào!")
    expect(response.message.role).toBe("assistant")
    expect(response.finish).toBe("stop")
    expect(response.requests).toBe(1)
    expect(response.usage).toEqual({
      inputTokens: 7,
      outputTokens: 23,
      thoughtTokens: 49,
      totalTokens: 79,
    })
  })

  it("reports tool calls, and finishes with tool_calls", async () => {
    const { client } = setup([
      answer({
        ...completed([
          { type: "function_call", id: "c1", name: "get_track", arguments: { trackId: "t1" } },
        ]),
        status: "requires_action",
      }),
    ])

    const response = await client.generate({ messages: [user("hi")], maxOutputTokens: 10 })

    expect(response.finish).toBe("tool_calls")
    expect(toolCallsOf(response.message)).toEqual([
      { type: "tool_call", id: "c1", name: "get_track", args: { trackId: "t1" } },
    ])
  })

  it("calls it tool_calls whenever the answer has a call, even if the status says completed", async () => {
    const { client } = setup([
      answer(completed([{ type: "function_call", id: "c1", name: "x", arguments: {} }])),
    ])

    expect((await client.generate({ messages: [user("hi")], maxOutputTokens: 10 })).finish).toBe(
      "tool_calls",
    )
  })

  it("finishes with length when the answer was cut off", async () => {
    const { client } = setup([answer({ ...completed([]), status: "incomplete" })])

    expect((await client.generate({ messages: [user("hi")], maxOutputTokens: 10 })).finish).toBe(
      "length",
    )
  })

  it("lets the next request give the reasoning back unchanged", async () => {
    const thought = { type: "thought", signature: "sig-abc" }
    const { client, sent } = setup([
      answer(completed([thought, { type: "function_call", id: "c1", name: "x", arguments: {} }])),
      answer(completed([textStep("done")])),
    ])

    const first = await client.generate({ messages: [user("hi")], maxOutputTokens: 10 })
    await client.generate({
      messages: [
        user("hi"),
        first.message,
        { role: "user", parts: [{ type: "tool_result", callId: "c1", name: "x", result: 1 }] },
      ],
      maxOutputTokens: 10,
    })

    const input = sent(1).body["input"] as { type: string }[]
    expect(input.map((step) => step.type)).toEqual([
      "user_input",
      "thought",
      "function_call",
      "function_result",
    ])
    expect(input[1]).toEqual(thought)
  })

  it.each([["failed"], ["cancelled"]])("treats status %s as unavailable", async (status) => {
    const { client } = setup([answer({ ...completed([]), status })])

    await expect(
      client.generate({ messages: [user("hi")], maxOutputTokens: 10 }),
    ).rejects.toBeInstanceOf(LlmUnavailableError)
  })

  it.each([[null], [{}], [{ steps: "no" }]])(
    "refuses an answer it cannot read: %j",
    async (body) => {
      const { client } = setup([answer(body)])

      await expect(
        client.generate({ messages: [user("hi")], maxOutputTokens: 10 }),
      ).rejects.toBeInstanceOf(LlmUnavailableError)
    },
  )
})

describe("GeminiInteractionsClient.generate: failures", () => {
  const call = (client: GeminiInteractionsClient) =>
    client.generate({ messages: [user("hi")], maxOutputTokens: 10 })

  it("tries a 429 once more after a short wait, and counts both requests", async () => {
    const { client, sleeps, fetchFn } = setup([
      answer({ error: { message: "quota" } }, 429),
      answer(completed([textStep("ok")])),
    ])

    const response = await call(client)

    expect(response.requests).toBe(2)
    expect(fetchFn).toHaveBeenCalledTimes(2)
    expect(sleeps).toEqual([2000])
  })

  it("waits as long as Retry-After asks, within reason", async () => {
    const { client, sleeps } = setup([
      answer({}, 429, { "retry-after": "5" }),
      answer({}, 429, { "retry-after": "600" }),
      answer({}, 429),
    ])
    await expect(call(client)).rejects.toBeInstanceOf(LlmRateLimitedError)
    // The second client call: Retry-After 600 is capped to 10 seconds.
    const second = setup([answer({}, 429, { "retry-after": "600" }), answer({}, 429)])
    await expect(call(second.client)).rejects.toBeInstanceOf(LlmRateLimitedError)

    expect(sleeps).toEqual([5000])
    expect(second.sleeps).toEqual([10_000])
  })

  it("gives up after the second 429 with a rate-limit error", async () => {
    const { client, fetchFn } = setup([answer({}, 429), answer({}, 429)])

    await expect(call(client)).rejects.toBeInstanceOf(LlmRateLimitedError)
    expect(fetchFn).toHaveBeenCalledTimes(2)
  })

  it.each([[500], [502], [503], [504]])(
    "tries a %s once more, then reports it as unavailable",
    async (status) => {
      const { client, fetchFn } = setup([answer({}, status), answer({}, status)])

      await expect(call(client)).rejects.toBeInstanceOf(LlmUnavailableError)
      expect(fetchFn).toHaveBeenCalledTimes(2)
    },
  )

  it("recovers when the second try works after a 503", async () => {
    const { client } = setup([answer({}, 503), answer(completed([textStep("back")]))])

    expect(textOf((await call(client)).message)).toBe("back")
  })

  it("treats a network failure as unavailable, after one more try", async () => {
    const { client, fetchFn } = setup([
      new TypeError("fetch failed"),
      new TypeError("fetch failed"),
    ])

    await expect(call(client)).rejects.toBeInstanceOf(LlmUnavailableError)
    expect(fetchFn).toHaveBeenCalledTimes(2)
  })

  it.each([[400], [401], [403], [404]])(
    "does not retry a %s: that is a bug or a bad key",
    async (status) => {
      const { client, fetchFn } = setup([answer({ error: { message: "bad request" } }, status)])

      const error: unknown = await call(client).catch((caught: unknown) => caught)

      expect(error).toBeInstanceOf(LlmRequestError)
      expect((error as LlmRequestError).status).toBe(status)
      expect(fetchFn).toHaveBeenCalledTimes(1)
    },
  )

  it("never puts the key in an error, even when the answer repeats it", async () => {
    const { client } = setup([answer({ error: { message: `bad key ${KEY} here` } }, 403)])

    const error = await call(client).catch((caught: Error) => caught)

    expect((error as Error).message).toContain("403")
    expect((error as Error).message).not.toContain(KEY)
    expect((error as Error).message).toContain("[key]")
  })

  it("does not retry when the caller gave up", async () => {
    const controller = new AbortController()
    const abort = new DOMException("aborted", "AbortError")
    const fetchFn = jest.fn<typeof fetch>(async () => {
      controller.abort()
      throw abort
    })
    const client = new GeminiInteractionsClient({
      apiKey: KEY,
      model: "m",
      fetchFn,
      sleep: async () => undefined,
    })

    await expect(
      client.generate({ messages: [user("hi")], maxOutputTokens: 10, signal: controller.signal }),
    ).rejects.toBe(abort)
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it("keeps a long error message short", async () => {
    const { client } = setup([answer({ error: { message: "x".repeat(5000) } }, 400)])

    const error = await call(client).catch((caught: Error) => caught)

    expect((error as Error).message.length).toBeLessThan(400)
  })
})
