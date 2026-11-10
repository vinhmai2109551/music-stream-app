import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import { Logger } from "@nestjs/common"
import { ScriptedLlmClient, toolCallResponse } from "../../shared/llm/scripted-llm-client.js"
import type { ChatEvent } from "./chat-events.js"
import { MessagesViewService } from "./messages-view.service.js"
import { buildChat, CONVERSATION, USER } from "./testing/fakes.js"

const CREATE = `[[call:create_playlist:{"name":"Chạy bộ","trackIds":["t1","t2"]}]]`

async function drain(generator: AsyncGenerator<ChatEvent, void>) {
  const events: ChatEvent[] = []
  for await (const event of generator) events.push(event)
  return events
}

/** Sends a message and returns what came back. */
async function say(built: ReturnType<typeof buildChat>, text: string) {
  const run = await built.chat.start(USER, CONVERSATION, text)
  return drain(run.events(new AbortController().signal))
}

/** Answers the first proposed change, `confirm` or `reject`. */
async function answer(
  built: ReturnType<typeof buildChat>,
  decision: "confirm" | "reject",
  actionId = "a1",
  userId = USER,
) {
  const run = await built.chat.resolveAction(userId, actionId, decision)
  return drain(run.events(new AbortController().signal))
}

beforeEach(() => {
  jest.restoreAllMocks()
  jest.spyOn(Logger.prototype, "log").mockImplementation(() => undefined)
  jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined)
  jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined)
})

describe("the conversation as the app shows it", () => {
  const view = (built: ReturnType<typeof buildChat>) =>
    new MessagesViewService(built.conversations.service, built.actions.service, built.registry)

  it("shows a waiting change as a card with its action, and then its outcome", async () => {
    const built = buildChat()
    await say(built, CREATE)

    const waiting = await view(built).list(USER, CONVERSATION)
    const card = waiting.find((line) => line.role === "tool")
    expect(card?.tool).toMatchObject({
      name: "create_playlist",
      ok: null,
      action: { id: "a1", status: "PENDING", summary: expect.stringContaining("Chạy bộ") },
    })

    await answer(built, "confirm")
    const done = await view(built).list(USER, CONVERSATION)
    const cards = done.filter((line) => line.role === "tool")
    expect(cards).toHaveLength(1)
    expect(cards[0].tool).toMatchObject({ ok: true, action: { status: "CONFIRMED" } })
    expect(cards[0].tool?.display?.playlists?.map((p) => p.id)).toEqual(["new-1"])
  })

  it("shows a refused or expired change as not done", async () => {
    const built = buildChat()
    await say(built, CREATE)
    await answer(built, "reject")

    const lines = await view(built).list(USER, CONVERSATION)

    expect(lines.find((l) => l.role === "tool")?.tool).toMatchObject({
      ok: false,
      action: { status: "REJECTED" },
    })
  })

  it("shows the cards of what the assistant looked up, between the texts", async () => {
    const llm = new ScriptedLlmClient([
      toolCallResponse(
        [{ id: "c1", name: "search_catalog", args: { query: "mưa" } }],
        "Để mình tìm.",
      ),
      "Đây.",
    ])
    const built = buildChat({ llm })
    await say(built, "nhạc mưa")

    const lines = await view(built).list(USER, CONVERSATION)

    expect(lines.map((l) => l.role)).toEqual(["user", "assistant", "tool", "assistant"])
    const card = lines[2].tool
    expect(card).toMatchObject({ name: "search_catalog", ok: true })
    expect(card?.display?.tracks).toHaveLength(5)
    expect(lines[2].text).toBe("")
  })

  it("never shows the tool calls and results themselves as text", async () => {
    const built = buildChat()
    await say(built, CREATE)
    await answer(built, "confirm")

    const lines = await view(built).list(USER, CONVERSATION)

    expect(lines.filter((l) => l.text).map((l) => l.role)).toEqual([
      "user",
      "assistant",
      "assistant",
    ])
    expect(JSON.stringify(lines.map((l) => l.text))).not.toContain("tool_result")
  })

  it("is a plain list of texts for a conversation without tools", async () => {
    const built = buildChat()
    await say(built, "xin chào")

    const lines = await view(built).list(USER, CONVERSATION)

    expect(lines.map((l) => [l.role, l.text])).toEqual([
      ["user", "xin chào"],
      ["assistant", "Bạn nói: xin chào"],
    ])
  })

  it("looks all the cards up once, however many lines show the same track", async () => {
    const built = buildChat()
    for (let round = 0; round < 4; round += 1) {
      await say(built, `[[call:get_track:{"id":"t1"}]]`)
    }
    built.tools.mocks.tracksByIds.mockClear()

    const lines = await view(built).list(USER, CONVERSATION)

    expect(lines.filter((l) => l.role === "tool")).toHaveLength(4)
    expect(built.tools.mocks.tracksByIds).toHaveBeenCalledTimes(1)
    for (const line of lines.filter((l) => l.role === "tool")) {
      expect(line.tool?.display?.tracks?.map((t) => t.id)).toEqual(["t1"])
    }
  })
})
