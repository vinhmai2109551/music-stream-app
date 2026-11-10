import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import { configureApi } from "@/api/client"
import { streamEvents } from "@/api/stream"

jest.mock("expo/fetch", () => ({ fetch: jest.fn() }))

/* eslint-disable @typescript-eslint/no-require-imports */
const fetchMock = jest.mocked(
  (require("expo/fetch") as typeof import("expo/fetch")).fetch,
) as unknown as jest.Mock<(url: string, init: Record<string, unknown>) => Promise<unknown>>
/* eslint-enable @typescript-eslint/no-require-imports */

const encoder = new TextEncoder()
const sse = (text: string) =>
  encoder.encode(`event: text_delta\ndata: ${JSON.stringify({ text })}\n\n`)

describe("a failure in the code that handles the events", () => {
  beforeEach(() => {
    fetchMock.mockReset()
    configureApi({
      getToken: () => "tok",
      refreshSession: async () => null,
      onUnauthorized: () => undefined,
    })
  })

  it("is thrown as it is (not as a network error), and the stream is cancelled", async () => {
    const boom = new Error("the handler broke")
    // Both events come in one chunk: the second must not be handed over after the first failed.
    const both = new Uint8Array([...sse("một"), ...sse("hai")])
    let cancelled = false
    let reads = 0
    fetchMock.mockResolvedValue({
      status: 200,
      ok: true,
      text: async () => "",
      body: {
        getReader: () => ({
          read: async () => (reads++ === 0 ? { done: false, value: both } : { done: true }),
          cancel: async () => {
            cancelled = true
          },
          releaseLock: () => undefined,
        }),
      },
    })
    const seen: string[] = []

    await expect(
      streamEvents(
        "/p",
        {},
        (event) => {
          if (event.type === "text_delta") seen.push(event.text)
          throw boom
        },
        new AbortController().signal,
      ),
    ).rejects.toBe(boom)

    expect(seen).toEqual(["một"])
    expect(cancelled).toBe(true)
  })
})
