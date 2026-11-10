import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import {
  ConflictException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common"
import { FAKE_TRIGGERS, FakeLlmClient } from "../../shared/llm/fake-llm-client.js"
import {
  LlmRateLimitedError,
  LlmUnavailableError,
  type LlmPart,
} from "../../shared/llm/llm-client.js"
import { ScriptedLlmClient } from "../../shared/llm/scripted-llm-client.js"
import type { ChatEvent } from "./chat-events.js"
import type { ChatService } from "./chat.service.js"
import type { StoredMessage } from "./history.js"
import { buildChat, CONVERSATION, USER } from "./testing/fakes.js"
import { SYSTEM_PROMPT } from "./system-prompt.js"

/** The whole chat on fakes, with the model of your choice. */
function setup(options: Parameters<typeof buildChat>[0] = {}) {
  return buildChat(options)
}

async function drain(generator: AsyncGenerator<ChatEvent, void>): Promise<ChatEvent[]> {
  const events: ChatEvent[] = []
  for await (const event of generator) events.push(event)
  return events
}

/** Sends a message and returns what came back. */
async function ask(chat: ChatService, text: string, signal = new AbortController().signal) {
  const run = await chat.start(USER, CONVERSATION, text)
  return drain(run.events(signal))
}

const textOf = (events: ChatEvent[]) =>
  events.flatMap((event) => (event.type === "text_delta" ? [event.text] : [])).join("")

beforeEach(() => {
  jest.restoreAllMocks()
  jest.spyOn(Logger.prototype, "log").mockImplementation(() => undefined)
  jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined)
  jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined)
})

describe("ChatService.start", () => {
  it("answers 503 and does nothing else while there is no model", async () => {
    const { chat, conversations, usage } = setup({ llm: null })

    expect(chat.enabled).toBe(false)
    await expect(chat.start(USER, CONVERSATION, "hi")).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    )
    expect(conversations.mocks.add).not.toHaveBeenCalled()
    expect(usage.mocks.consume).not.toHaveBeenCalled()
  })

  it("answers 404 for a conversation of somebody else, without counting the message", async () => {
    const { chat, conversations, usage } = setup()
    conversations.state.owner = "someone-else"

    await expect(chat.start(USER, CONVERSATION, "hi")).rejects.toBeInstanceOf(NotFoundException)
    expect(usage.state.used).toBe(0)
    expect(conversations.messages).toHaveLength(0)
  })

  it("answers 429 at the daily limit, keeps nothing, and frees the conversation", async () => {
    const { chat, conversations, usage } = setup({ limit: 1 })
    await ask(chat, "first")

    await expect(chat.start(USER, CONVERSATION, "second")).rejects.toMatchObject({ status: 429 })
    // Not left "busy" by the refusal: the next day it works again.
    usage.state.used = 0
    expect(textOf(await ask(chat, "third"))).toContain("third")
    expect(conversations.messages.map((m) => m.role)).toEqual([
      "user",
      "assistant",
      "user",
      "assistant",
    ])
  })

  it("answers 409 while the previous answer is still being written", async () => {
    const { chat } = setup()
    const first = await chat.start(USER, CONVERSATION, "one")

    await expect(chat.start(USER, CONVERSATION, "two")).rejects.toBeInstanceOf(ConflictException)

    await drain(first.events(new AbortController().signal))
    await expect(chat.start(USER, CONVERSATION, "two")).resolves.toBeDefined()
  })

  it("saves the question and counts the message at once", async () => {
    const { chat, conversations, usage } = setup()

    await chat.start(USER, CONVERSATION, "Gợi ý nhạc buồn")

    expect(usage.state.used).toBe(1)
    expect(conversations.messages[0]).toMatchObject({
      role: "user",
      parts: [{ type: "text", text: "Gợi ý nhạc buồn" }],
    })
  })

  it("passes the daily limit of the settings", async () => {
    const { chat, usage } = setup({ settings: { AI_DAILY_MESSAGE_LIMIT: "7" } })

    await chat.start(USER, CONVERSATION, "hi")

    expect(chat.limit).toBe(7)
    expect(usage.mocks.consume).toHaveBeenCalledWith(USER, 7)
  })
})

describe("ChatService answer", () => {
  it("streams the text piece by piece, then says it is done", async () => {
    const { chat } = setup()

    const events = await ask(chat, "nhạc chill cuối tuần")

    // "Bạn ", "nói: ", "nhạc ", "chill ", "cuối ", "tuần": one event per word.
    expect(events.map((e) => e.type)).toEqual([
      "text_delta",
      "text_delta",
      "text_delta",
      "text_delta",
      "text_delta",
      "text_delta",
      "done",
    ])
    expect(textOf(events)).toBe("Bạn nói: nhạc chill cuối tuần")
    expect(events[events.length - 1]).toMatchObject({ type: "done", truncated: false })
  })

  it("saves the answer with its parts, names the conversation, and returns its id", async () => {
    const { chat, conversations } = setup()

    const events = await ask(chat, "Xin chào")
    const done = events[events.length - 1]

    expect(conversations.messages.map((m) => m.role)).toEqual(["user", "assistant"])
    expect(conversations.messages[1].parts).toEqual([{ type: "text", text: "Bạn nói: Xin chào" }])
    expect(done).toMatchObject({ type: "done", messageId: conversations.messages[1].id })
    expect(conversations.state.named).toEqual(["Xin chào"])
  })

  it("saves the reasoning parts of the model exactly as received", async () => {
    const parts: LlmPart[] = [
      { type: "opaque", provider: "gemini", data: { type: "thought", signature: "S" } },
      { type: "text", text: "Đây là gợi ý." },
    ]
    const llm = new ScriptedLlmClient([
      {
        message: { role: "assistant", parts },
        finish: "stop",
        requests: 1,
        usage: { inputTokens: 1, outputTokens: 1, thoughtTokens: 0, totalTokens: 2 },
      },
    ])
    const { chat, conversations } = setup({ llm })

    await ask(chat, "hi")

    expect(conversations.messages[1].parts).toEqual(parts)
  })

  it("sends the instructions, the settings and the last 20 messages to the model", async () => {
    const initial: StoredMessage[] = Array.from({ length: 30 }, (_, i) => ({
      role: i % 2 === 0 ? ("user" as const) : ("assistant" as const),
      parts: [{ type: "text" as const, text: `m${i}` }],
    }))
    const llm = new FakeLlmClient()
    const { chat } = setup({ llm, initial, settings: { AI_MAX_TOKENS: "321" } })

    await ask(chat, "câu mới")

    const request = llm.requests[0]
    expect(request.system).toBe(SYSTEM_PROMPT)
    expect(request.maxOutputTokens).toBe(321)
    expect(request.messages.length).toBeLessThanOrEqual(20)
    expect(request.messages[0].role).toBe("user")
    const last = request.messages[request.messages.length - 1]
    expect(last).toEqual({ role: "user", parts: [{ type: "text", text: "câu mới" }] })
    expect(request.messages.map((m) => (m.parts[0] as { text: string }).text)).not.toContain("m0")
  })

  it("passes a cancellation signal to the model", async () => {
    const llm = new FakeLlmClient()
    const { chat } = setup({ llm })

    await ask(chat, "hi")

    expect(llm.requests[0].signal).toBeInstanceOf(AbortSignal)
  })

  it("says so when the answer was cut off by the token limit", async () => {
    const { chat, conversations } = setup()

    const events = await ask(chat, `dài ${FAKE_TRIGGERS.long}`)

    expect(events[events.length - 1]).toMatchObject({ type: "done", truncated: true })
    expect(conversations.messages).toHaveLength(2)
  })

  it("lets the next message in once the answer is done", async () => {
    const { chat } = setup()
    await ask(chat, "one")

    expect(textOf(await ask(chat, "two"))).toBe("Bạn nói: two")
  })
})

describe("ChatService failures", () => {
  it.each([
    [FAKE_TRIGGERS.rateLimited, "assistant_busy", "Trợ lý đang quá tải, thử lại sau ít phút"],
    [FAKE_TRIGGERS.unavailable, "assistant_unavailable", undefined],
  ])("%s becomes the error event %s", async (trigger, code, message) => {
    const { chat } = setup()

    const events = await ask(chat, `câu hỏi ${trigger}`)

    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ type: "error", code })
    if (message) expect(events[0]).toMatchObject({ message })
  })

  it("takes the question back and gives the message back when the model fails", async () => {
    const { chat, conversations, usage } = setup()

    await ask(chat, `hỏi ${FAKE_TRIGGERS.rateLimited}`)

    expect(conversations.messages).toEqual([])
    expect(usage.state.used).toBe(0)
    expect(conversations.state.named).toEqual([])
  })

  it("frees the conversation after a failure so that the person can try again", async () => {
    const { chat } = setup()
    await ask(chat, `a ${FAKE_TRIGGERS.unavailable}`)

    expect(textOf(await ask(chat, "b"))).toBe("Bạn nói: b")
  })

  it("treats an answer with no text as a failure, not as a saved empty message", async () => {
    const { chat, conversations, usage } = setup()

    const events = await ask(chat, `trống ${FAKE_TRIGGERS.empty}`)

    expect(events).toEqual([expect.objectContaining({ type: "error", code: "empty_answer" })])
    expect(conversations.messages).toEqual([])
    expect(usage.state.used).toBe(0)
  })

  it("hides the details of an unexpected error from the person", async () => {
    const llm = new ScriptedLlmClient([new Error("secret internal detail AIza123")])
    const { chat } = setup({ llm })

    const events = await ask(chat, "hi")

    expect(events).toEqual([expect.objectContaining({ type: "error", code: "assistant_error" })])
    expect(JSON.stringify(events)).not.toContain("secret")
  })

  it("an error of the model after some text still ends in an error event and a rollback", async () => {
    const llm = new FakeLlmClient()
    llm.stream = async function* () {
      yield { type: "text_delta", text: "Bạn " }
      throw new LlmUnavailableError()
    }
    const { chat, conversations, usage } = setup({ llm })

    const events = await ask(chat, "hi")

    expect(events.map((e) => e.type)).toEqual(["text_delta", "error"])
    expect(conversations.messages).toEqual([])
    expect(usage.state.used).toBe(0)
  })

  it("reports a rate limit that happens on the second request as busy too", async () => {
    const llm = new ScriptedLlmClient([new LlmRateLimitedError()])
    const { chat } = setup({ llm })

    expect((await ask(chat, "hi"))[0]).toMatchObject({ code: "assistant_busy" })
  })
})

describe("ChatService when the person leaves", () => {
  it("stops quietly, keeps nothing and frees the conversation", async () => {
    const { chat, conversations, usage } = setup()
    const gone = new AbortController()
    const run = await chat.start(USER, CONVERSATION, `chờ ${FAKE_TRIGGERS.slow}`)
    const events = drain(run.events(gone.signal))

    setTimeout(() => gone.abort(new Error("closed")), 20)

    expect(await events).toEqual([])
    expect(conversations.messages).toEqual([])
    expect(usage.state.used).toBe(0)
    expect(textOf(await ask(chat, "lại"))).toBe("Bạn nói: lại")
  })

  it("cleans up when the caller stops reading the events", async () => {
    const { chat, conversations, usage } = setup()
    const run = await chat.start(USER, CONVERSATION, "một hai ba bốn")
    const events = run.events(new AbortController().signal)

    await events.next() // first piece
    await events.return()

    expect(conversations.messages).toEqual([])
    expect(usage.state.used).toBe(0)
    await expect(chat.start(USER, CONVERSATION, "again")).resolves.toBeDefined()
  })
})

describe("ChatService.start cancel and tickets", () => {
  it("cancel gives the message up when the events were never read, and only once", async () => {
    const { chat, conversations, usage } = setup()
    const run = await chat.start(USER, CONVERSATION, "hi")
    expect(chat.isBusy(CONVERSATION)).toBe(true)

    await run.cancel()
    await run.cancel()

    expect(chat.isBusy(CONVERSATION)).toBe(false)
    expect(conversations.messages).toEqual([])
    expect(usage.state.used).toBe(0)
    expect(usage.mocks.release).toHaveBeenCalledTimes(1)
  })

  it("cancel after the answer was saved changes nothing", async () => {
    const { chat, conversations, usage } = setup()
    const run = await chat.start(USER, CONVERSATION, "hi")
    await drain(run.events(new AbortController().signal))

    await run.cancel()

    expect(conversations.messages).toHaveLength(2)
    expect(usage.state.used).toBe(1)
  })

  it("gives the message back on the day it was taken", async () => {
    const { chat, usage } = setup()

    await ask(chat, `hỏi ${FAKE_TRIGGERS.unavailable}`)

    expect(usage.mocks.release).toHaveBeenCalledWith({ userId: "u1", day: "2026-11-09" })
  })

  it("gives the message back when the question could not be saved", async () => {
    const { chat, conversations, usage } = setup()
    conversations.mocks.add.mockRejectedValueOnce(new Error("database down"))

    await expect(chat.start(USER, CONVERSATION, "hi")).rejects.toThrow("database down")

    expect(usage.state.used).toBe(0)
    expect(chat.isBusy(CONVERSATION)).toBe(false)
  })
})
