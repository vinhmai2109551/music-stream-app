import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import { ApiError, configureApi } from "@/api/client"
import { streamEvents } from "@/api/stream"
import type { AssistantEvent } from "@/api/types"
import { copy } from "@/constants/copy"

jest.mock("expo/fetch", () => ({ fetch: jest.fn() }))

/* eslint-disable @typescript-eslint/no-require-imports */
const fetchMock = jest.mocked(
  (require("expo/fetch") as typeof import("expo/fetch")).fetch,
) as unknown as jest.Mock<(url: string, init: Record<string, unknown>) => Promise<unknown>>
/* eslint-enable @typescript-eslint/no-require-imports */

const encoder = new TextEncoder()

/** A body that gives these chunks one by one, then ends (or fails, if `fail` is set). */
function bodyOf(chunks: (string | Uint8Array)[], fail?: Error) {
  const queue = [...chunks]
  let cancelled = false
  return {
    cancelled: () => cancelled,
    getReader: () => ({
      read: async () => {
        if (cancelled) return { done: true }
        const next = queue.shift()
        if (next === undefined) {
          if (fail) throw fail
          return { done: true }
        }
        return { done: false, value: typeof next === "string" ? encoder.encode(next) : next }
      },
      cancel: async () => {
        cancelled = true
      },
      releaseLock: () => undefined,
    }),
  }
}

const stream = (chunks: (string | Uint8Array)[], fail?: Error) => ({
  status: 200,
  ok: true,
  body: bodyOf(chunks, fail),
  text: async () => "",
})
const failure = (status: number, body: unknown) => ({
  status,
  ok: false,
  body: null,
  text: async () => JSON.stringify(body),
})

const sse = (event: string, data: unknown) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`

const getToken = jest.fn<() => string | null>()
const refreshSession = jest.fn<() => Promise<string | null>>()
const onUnauthorized = jest.fn<() => void>()

async function collect(
  path = "/ai/conversations/c1/messages",
  body: unknown = { text: "hi" },
  signal: AbortSignal = new AbortController().signal,
) {
  const events: AssistantEvent[] = []
  await streamEvents(path, body, (event) => events.push(event), signal)
  return events
}

beforeEach(() => {
  fetchMock.mockReset()
  getToken.mockReset().mockReturnValue("tok")
  refreshSession.mockReset()
  onUnauthorized.mockReset()
  configureApi({ getToken, refreshSession, onUnauthorized })
})

describe("the request", () => {
  it("posts the JSON body with the token and asks for an event stream", async () => {
    fetchMock.mockResolvedValue(stream([]))
    await collect("/ai/conversations/c1/messages", { text: "xin chào" })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("http://api.test/api/ai/conversations/c1/messages")
    expect(init).toMatchObject({
      method: "POST",
      body: JSON.stringify({ text: "xin chào" }),
      headers: {
        Accept: "text/event-stream",
        "Content-Type": "application/json",
        Authorization: "Bearer tok",
      },
    })
  })

  it("sends no body and no content type when there is none (confirm / reject)", async () => {
    fetchMock.mockResolvedValue(stream([]))
    await streamEvents(
      "/ai/actions/a1/confirm",
      undefined,
      () => undefined,
      new AbortController().signal,
    )

    const [, init] = fetchMock.mock.calls[0]
    expect(init.body).toBeUndefined()
    expect(init.headers).not.toHaveProperty("Content-Type")
  })

  it("sends no Authorization header without a token", async () => {
    getToken.mockReturnValue(null)
    fetchMock.mockResolvedValue(stream([]))
    await collect()

    expect(fetchMock.mock.calls[0][1].headers).not.toHaveProperty("Authorization")
  })
})

describe("the events", () => {
  it("hands each event over as it arrives", async () => {
    fetchMock.mockResolvedValue(
      stream([
        sse("text_delta", { text: "Xin " }),
        sse("text_delta", { text: "chào" }),
        sse("done", { messageId: "m1", truncated: false, awaitingAction: false }),
      ]),
    )

    expect(await collect()).toEqual([
      { type: "text_delta", text: "Xin " },
      { type: "text_delta", text: "chào" },
      { type: "done", messageId: "m1", truncated: false, awaitingAction: false },
    ])
  })

  it("puts together an event that arrives in pieces", async () => {
    const whole = sse("text_delta", { text: "Lạc trôi" })
    fetchMock.mockResolvedValue(stream([whole.slice(0, 14), whole.slice(14, 30), whole.slice(30)]))

    expect(await collect()).toEqual([{ type: "text_delta", text: "Lạc trôi" }])
  })

  it("puts together a character that is cut between two chunks", async () => {
    const bytes = encoder.encode(sse("text_delta", { text: "Sơn Tùng ♪" }))
    for (let cut = 1; cut < bytes.length; cut += 1) {
      fetchMock.mockResolvedValue(stream([bytes.slice(0, cut), bytes.slice(cut)]))
      const events = await collect()
      expect(events).toEqual([{ type: "text_delta", text: "Sơn Tùng ♪" }])
    }
  })

  it("ignores heartbeats, events it does not know and data it cannot read", async () => {
    fetchMock.mockResolvedValue(
      stream([
        ": ping\n\n",
        sse("brand_new", { a: 1 }),
        "event: text_delta\ndata: {broken\n\n",
        sse("text_delta", { text: "ok" }),
      ]),
    )

    expect(await collect()).toEqual([{ type: "text_delta", text: "ok" }])
  })

  it("gives the last event even if the stream ends without the blank line", async () => {
    fetchMock.mockResolvedValue(stream(['event: text_delta\ndata: {"text":"cuối"}']))
    expect(await collect()).toEqual([{ type: "text_delta", text: "cuối" }])
  })
})

describe("errors before the stream starts", () => {
  it.each([
    [404, "Conversation not found"],
    [409, "Trợ lý đang trả lời"],
    [410, "Đề xuất đã hết hạn"],
    [429, "Bạn đã dùng hết tin nhắn hôm nay"],
    [503, "Assistant is not configured"],
  ])("%d is an ApiError with the message of the server", async (status, message) => {
    fetchMock.mockResolvedValue(failure(status, { message }))

    await expect(collect()).rejects.toMatchObject({ status, kind: "http", message })
  })

  it("a failed request is not retried (only a 401 is)", async () => {
    fetchMock.mockResolvedValue(failure(500, { message: "x" }))
    await expect(collect()).rejects.toBeInstanceOf(ApiError)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("no network is an ApiError of kind network", async () => {
    fetchMock.mockRejectedValue(new TypeError("Network request failed"))

    await expect(collect()).rejects.toMatchObject({
      kind: "network",
      message: copy.errors.network,
    })
  })

  it("a server that does not answer is a timeout", async () => {
    jest.useFakeTimers()
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          ;(init.signal as AbortSignal).addEventListener("abort", () =>
            reject(new Error("aborted")),
          )
        }),
    )

    const pending = collect()
    const assertion = expect(pending).rejects.toMatchObject({
      kind: "timeout",
      message: copy.errors.timeout,
    })
    await jest.advanceTimersByTimeAsync(20_000)
    await assertion
  })

  it("an answer without a body is a network error", async () => {
    fetchMock.mockResolvedValue({ status: 200, ok: true, body: null, text: async () => "" })
    await expect(collect()).rejects.toMatchObject({ kind: "network" })
  })
})

describe("the token", () => {
  it("renews it once on a 401 and sends the request again with the new one", async () => {
    refreshSession.mockResolvedValue("fresh")
    fetchMock
      .mockResolvedValueOnce(failure(401, { message: "Unauthorized" }))
      .mockResolvedValueOnce(stream([sse("text_delta", { text: "ok" })]))

    expect(await collect()).toEqual([{ type: "text_delta", text: "ok" }])
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect((fetchMock.mock.calls[1][1].headers as Record<string, string>).Authorization).toBe(
      "Bearer fresh",
    )
    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it("signs the person out when it cannot be renewed", async () => {
    refreshSession.mockResolvedValue(null)
    fetchMock.mockResolvedValue(failure(401, { message: "Unauthorized" }))

    await expect(collect()).rejects.toMatchObject({ status: 401 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })

  it("signs the person out when the new token is rejected too, and does not try a third time", async () => {
    refreshSession.mockResolvedValue("fresh")
    fetchMock.mockResolvedValue(failure(401, { message: "Unauthorized" }))

    await expect(collect()).rejects.toMatchObject({ status: 401 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })

  it("does not renew a request that had no token", async () => {
    getToken.mockReturnValue(null)
    fetchMock.mockResolvedValue(failure(401, { message: "Unauthorized" }))

    await expect(collect()).rejects.toMatchObject({ status: 401 })
    expect(refreshSession).not.toHaveBeenCalled()
  })
})

describe("a stream that breaks, and stopping", () => {
  it("a stream that fails midway is a network error (what arrived was already handed over)", async () => {
    fetchMock.mockResolvedValue(stream([sse("text_delta", { text: "một" })], new Error("reset")))
    const seen: AssistantEvent[] = []

    await expect(
      streamEvents("/p", {}, (event) => seen.push(event), new AbortController().signal),
    ).rejects.toMatchObject({ kind: "network" })
    expect(seen).toEqual([{ type: "text_delta", text: "một" }])
  })

  it("aborting before the server answers ends quietly", async () => {
    const controller = new AbortController()
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          ;(init.signal as AbortSignal).addEventListener("abort", () =>
            reject(new Error("aborted")),
          )
        }),
    )

    const pending = collect("/p", {}, controller.signal)
    controller.abort()
    await expect(pending).resolves.toEqual([])
  })

  it("aborting midway stops reading, cancels the body and ends quietly", async () => {
    const controller = new AbortController()
    const response = stream([sse("text_delta", { text: "a" })])
    const reader = response.body.getReader()
    const read = jest.fn(async () => {
      if (read.mock.calls.length === 1) {
        return { done: false, value: encoder.encode(sse("text_delta", { text: "a" })) }
      }
      controller.abort()
      throw new Error("cancelled")
    })
    const cancel = jest.fn(async () => undefined)
    fetchMock.mockResolvedValue({
      status: 200,
      ok: true,
      body: { getReader: () => ({ ...reader, read, cancel, releaseLock: () => undefined }) },
      text: async () => "",
    })

    const events = await collect("/p", {}, controller.signal)

    expect(events).toEqual([{ type: "text_delta", text: "a" }])
    expect(cancel).toHaveBeenCalled()
  })
})
