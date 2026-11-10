import { describe, expect, it } from "@jest/globals"
import { FAKE_TRIGGERS, FakeLlmClient } from "./fake-llm-client.js"
import { ScriptedLlmClient } from "./scripted-llm-client.js"
import {
  LlmRateLimitedError,
  LlmUnavailableError,
  textOf,
  type LlmMessage,
  type LlmStreamEvent,
} from "./llm-client.js"

const user = (text: string): LlmMessage => ({ role: "user", parts: [{ type: "text", text }] })

async function collect(stream: AsyncGenerator<LlmStreamEvent>) {
  const events: LlmStreamEvent[] = []
  for await (const event of stream) events.push(event)
  return events
}

describe("FakeLlmClient", () => {
  it("echoes the last question, word by word, then gives the whole response", async () => {
    const client = new FakeLlmClient()

    const events = await collect(
      client.stream({ messages: [user("cũ"), user("nhạc chill")], maxOutputTokens: 10 }),
    )

    expect(events.map((e) => e.type)).toEqual([
      "text_delta",
      "text_delta",
      "text_delta",
      "text_delta",
      "done",
    ])
    const done = events[4]
    if (done.type !== "done") throw new Error("no done")
    expect(textOf(done.response.message)).toBe("Bạn nói: nhạc chill")
    expect(done.response.finish).toBe("stop")
  })

  it("generate gives the same response", async () => {
    const response = await new FakeLlmClient().generate({
      messages: [user("xin chào")],
      maxOutputTokens: 10,
    })
    expect(textOf(response.message)).toBe("Bạn nói: xin chào")
  })

  it("remembers its requests", async () => {
    const client = new FakeLlmClient()
    await client.generate({ messages: [user("a")], maxOutputTokens: 5, system: "s" })
    expect(client.requests).toHaveLength(1)
    expect(client.requests[0].system).toBe("s")
  })

  it("fails the way the triggers say", async () => {
    const client = new FakeLlmClient()
    const ask = (trigger: string) =>
      collect(client.stream({ messages: [user(`x ${trigger}`)], maxOutputTokens: 5 }))

    await expect(ask(FAKE_TRIGGERS.rateLimited)).rejects.toBeInstanceOf(LlmRateLimitedError)
    await expect(ask(FAKE_TRIGGERS.unavailable)).rejects.toBeInstanceOf(LlmUnavailableError)
  })

  it("gives an empty answer and a cut-off answer on request", async () => {
    const client = new FakeLlmClient()

    const empty = await client.generate({
      messages: [user(FAKE_TRIGGERS.empty)],
      maxOutputTokens: 5,
    })
    const long = await client.generate({ messages: [user(FAKE_TRIGGERS.long)], maxOutputTokens: 5 })

    expect(empty.message.parts).toEqual([])
    expect(long.finish).toBe("length")
  })

  it("waits until it is cancelled when asked to be slow", async () => {
    const client = new FakeLlmClient()
    const controller = new AbortController()
    const run = collect(
      client.stream({
        messages: [user(FAKE_TRIGGERS.slow)],
        maxOutputTokens: 5,
        signal: controller.signal,
      }),
    )

    controller.abort(new Error("closed"))

    await expect(run).rejects.toThrow("closed")
  })
})

describe("ScriptedLlmClient.stream", () => {
  it("streams its text word by word and then the response", async () => {
    const client = new ScriptedLlmClient(["Xin chào các bạn Sơn"])

    const events = await collect(client.stream({ messages: [user("hi")], maxOutputTokens: 5 }))

    expect(events.flatMap((event) => (event.type === "text_delta" ? [event.text] : []))).toEqual([
      "Xin ",
      "chào ",
      "các ",
      "bạn ",
      "Sơn",
    ])
    expect(events[events.length - 1].type).toBe("done")
  })

  it("keeps a capital S and the words of a text with an S", async () => {
    const client = new ScriptedLlmClient(["Spotify Sound"])
    const events = await collect(client.stream({ messages: [user("hi")], maxOutputTokens: 5 }))
    expect(
      events.flatMap((event) => (event.type === "text_delta" ? [event.text] : [])).join(""),
    ).toBe("Spotify Sound")
  })

  it("throws a scripted error", async () => {
    const client = new ScriptedLlmClient([new LlmUnavailableError()])
    await expect(
      collect(client.stream({ messages: [user("hi")], maxOutputTokens: 5 })),
    ).rejects.toBeInstanceOf(LlmUnavailableError)
  })
})
