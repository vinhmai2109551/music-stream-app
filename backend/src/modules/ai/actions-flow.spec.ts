import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import {
  ConflictException,
  GoneException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common"
import { FakeLlmClient } from "../../shared/llm/fake-llm-client.js"
import { LlmRateLimitedError } from "../../shared/llm/llm-client.js"
import { ScriptedLlmClient, toolCallResponse } from "../../shared/llm/scripted-llm-client.js"
import type { ChatEvent } from "./chat-events.js"
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

const types = (events: ChatEvent[]) => events.map((event) => event.type)
const textOf = (events: ChatEvent[]) =>
  events.flatMap((e) => (e.type === "text_delta" ? [e.text] : [])).join("")

beforeEach(() => {
  jest.restoreAllMocks()
  jest.spyOn(Logger.prototype, "log").mockImplementation(() => undefined)
  jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined)
  jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined)
})

describe("proposing a change", () => {
  it("ends the stream waiting for the person, with nothing changed and one pending action", async () => {
    const built = buildChat()

    const events = await say(built, CREATE)

    expect(types(events)).toContain("action_required")
    expect(events[events.length - 1]).toMatchObject({ type: "done", awaitingAction: true })
    expect(built.tools.mocks.createPlaylist).not.toHaveBeenCalled()
    expect(built.actions.state.rows.get("a1")?.status).toBe("PENDING")
    expect(built.chat.isBusy(CONVERSATION)).toBe(false)
  })

  it("counts as one message of the daily limit and keeps it", async () => {
    const built = buildChat()

    await say(built, CREATE)

    expect(built.usage.state.used).toBe(1)
  })
})

describe("confirming", () => {
  it("carries the change out, shows its card, and lets the assistant finish", async () => {
    const built = buildChat()
    await say(built, CREATE)

    const events = await answer(built, "confirm")

    expect(built.tools.mocks.createPlaylist).toHaveBeenCalledWith("u1", "Chạy bộ", undefined, [
      "t1",
      "t2",
    ])
    expect(events[0]).toMatchObject({
      type: "tool_result",
      callId: "fake_call_1",
      name: "create_playlist",
      ok: true,
      action: { id: "a1", status: "CONFIRMED" },
    })
    const first = events[0]
    if (first.type !== "tool_result") throw new Error("no result")
    expect(first.display?.playlists?.map((p) => p.id)).toEqual(["new-1"])
    expect(textOf(events)).toBe("Kết quả công cụ: create_playlist: ok")
    expect(events[events.length - 1]).toMatchObject({ type: "done", awaitingAction: false })
    expect(built.actions.state.rows.get("a1")).toMatchObject({ status: "CONFIRMED" })
  })

  it("keeps the result in the conversation so that the model can see what happened", async () => {
    const built = buildChat()
    await say(built, CREATE)

    await answer(built, "confirm")

    const roles = built.conversations.messages.map((m) => `${m.role}:${m.parts[0].type}`)
    expect(roles).toEqual(["user:text", "assistant:text", "user:tool_result", "assistant:text"])
    const result = built.conversations.messages[2].parts[0] as { callId: string; isError?: boolean }
    expect(result).toMatchObject({ callId: "fake_call_1" })
    expect(result.isError).toBeUndefined()
  })

  it("counts as a message of the daily limit: the answer after it is a model call", async () => {
    const built = buildChat()
    await say(built, CREATE)

    await answer(built, "confirm")

    expect(built.usage.state.used).toBe(2)
  })

  it("at the limit still carries the change out, reports it, and does not call the model", async () => {
    const llm = new FakeLlmClient()
    const built = buildChat({ llm, limit: 1 })
    await say(built, CREATE)
    const calls = llm.requests.length

    const events = await answer(built, "confirm")

    expect(built.tools.mocks.createPlaylist).toHaveBeenCalledTimes(1)
    expect(types(events)).toEqual(["tool_result", "text_delta", "done"])
    expect(textOf(events)).toContain("Đã thực hiện xong")
    expect(textOf(events)).toContain("dùng hết lượt")
    expect(llm.requests).toHaveLength(calls)
    expect(built.usage.state.used).toBe(1)
    expect(built.chat.isBusy(CONVERSATION)).toBe(false)
    // The conversation stays valid: the call has its result and the assistant has spoken.
    expect(built.conversations.messages.map((m) => m.parts[0].type)).toEqual([
      "text",
      "text",
      "tool_result",
      "text",
    ])
  })

  it("at the limit reports a refusal the same way", async () => {
    const built = buildChat({ limit: 1 })
    await say(built, CREATE)

    const events = await answer(built, "reject")

    expect(built.tools.mocks.createPlaylist).not.toHaveBeenCalled()
    expect(textOf(events)).toContain("bỏ qua đề xuất")
  })

  it("gives the model the results of a whole round together, in one message", async () => {
    const llm = new FakeLlmClient()
    const built = buildChat({ llm })
    await say(built, `[[call:search_catalog:{"query":"x"}]] ${CREATE}`)
    // The read waits with the change: nothing stored yet but the question and the proposal.
    expect(built.conversations.messages.map((m) => m.parts[0].type)).toEqual(["text", "text"])

    await answer(built, "confirm")

    const results = built.conversations.messages[2].parts as { type: string; name: string }[]
    expect(results.map((p) => [p.type, p.name])).toEqual([
      ["tool_result", "search_catalog"],
      ["tool_result", "create_playlist"],
    ])
    const request = llm.requests[llm.requests.length - 1]
    expect(request.messages[request.messages.length - 1].parts).toHaveLength(2)
  })

  it("tells the model about those results too when the change expires", async () => {
    const built = buildChat()
    await say(built, `[[call:search_catalog:{"query":"x"}]] ${CREATE}`)

    await say(built, "thôi, chuyện khác")

    const results = built.conversations.messages
      .flatMap((m) => m.parts)
      .filter((p) => p.type === "tool_result") as { name: string }[]
    expect(results.map((p) => p.name)).toEqual(["search_catalog", "create_playlist"])
  })

  it("only works once: a second yes is a conflict and changes nothing more", async () => {
    const built = buildChat()
    await say(built, CREATE)
    await answer(built, "confirm")

    await expect(built.chat.resolveAction(USER, "a1", "confirm")).rejects.toBeInstanceOf(
      ConflictException,
    )
    await expect(built.chat.resolveAction(USER, "a1", "reject")).rejects.toBeInstanceOf(
      ConflictException,
    )

    expect(built.tools.mocks.createPlaylist).toHaveBeenCalledTimes(1)
  })

  it("tells the model when the change itself fails, and does not throw", async () => {
    const built = buildChat()
    await say(built, CREATE)
    built.tools.mocks.createPlaylist.mockRejectedValueOnce(new Error("db down"))

    const events = await answer(built, "confirm")

    expect(events[0]).toMatchObject({ type: "tool_result", ok: false })
    expect(textOf(events)).toBe("Kết quả công cụ: create_playlist: lỗi")
    expect(JSON.stringify(built.conversations.messages)).not.toContain("db down")
  })
})

describe("rejecting", () => {
  it("changes nothing, tells the model, and lets it answer", async () => {
    const built = buildChat()
    await say(built, CREATE)

    const events = await answer(built, "reject")

    expect(built.tools.mocks.createPlaylist).not.toHaveBeenCalled()
    expect(events[0]).toMatchObject({
      type: "tool_result",
      ok: false,
      action: { status: "REJECTED" },
    })
    expect(textOf(events)).toBe("Kết quả công cụ: create_playlist: lỗi")
    expect(built.actions.state.rows.get("a1")?.status).toBe("REJECTED")
    expect(JSON.stringify(built.conversations.messages[2])).toContain("NOT made")
  })
})

describe("who may answer, and when", () => {
  it("is not found for another user, and changes nothing", async () => {
    const built = buildChat()
    await say(built, CREATE)

    await expect(built.chat.resolveAction("intruder", "a1", "confirm")).rejects.toBeInstanceOf(
      NotFoundException,
    )
    await expect(built.chat.resolveAction(USER, "ghost", "confirm")).rejects.toBeInstanceOf(
      NotFoundException,
    )

    expect(built.tools.mocks.createPlaylist).not.toHaveBeenCalled()
    expect(built.actions.state.rows.get("a1")?.status).toBe("PENDING")
  })

  it("is gone after 10 minutes: marks it expired and tells the model", async () => {
    const built = buildChat()
    await say(built, CREATE)
    built.actions.state.rows.get("a1")!.expiresAt = new Date(Date.now() - 1000)

    await expect(built.chat.resolveAction(USER, "a1", "confirm")).rejects.toBeInstanceOf(
      GoneException,
    )

    expect(built.tools.mocks.createPlaylist).not.toHaveBeenCalled()
    expect(built.actions.state.rows.get("a1")?.status).toBe("EXPIRED")
    expect(JSON.stringify(built.conversations.messages[2])).toContain("did not answer in time")
    // And the conversation is free again.
    expect(built.chat.isBusy(CONVERSATION)).toBe(false)
    expect(await say(built, "tiếp tục")).not.toHaveLength(0)
  })

  it("is over when the person writes something else instead", async () => {
    const llm = new FakeLlmClient()
    const built = buildChat({ llm })
    await say(built, CREATE)

    const events = await say(built, "thôi, chuyện khác")

    expect(events[events.length - 1]).toMatchObject({ type: "done" })
    expect(built.actions.state.rows.get("a1")?.status).toBe("EXPIRED")
    // The model is given a result for its call before the new question: it would refuse otherwise.
    const request = llm.requests[llm.requests.length - 1]
    const parts = request.messages.flatMap((m) => m.parts)
    const call = parts.findIndex((p) => p.type === "tool_call")
    const result = parts.findIndex((p) => p.type === "tool_result")
    expect(call).toBeGreaterThanOrEqual(0)
    expect(result).toBeGreaterThan(call)
    expect(request.messages[request.messages.length - 1].parts[0]).toMatchObject({
      type: "text",
      text: "thôi, chuyện khác",
    })
    // And it can no longer be approved.
    await expect(built.chat.resolveAction(USER, "a1", "confirm")).rejects.toBeInstanceOf(
      ConflictException,
    )
  })

  it("is refused while an answer is being written in the conversation", async () => {
    const built = buildChat()
    await say(built, CREATE)
    const first = await built.chat.start(USER, CONVERSATION, "hỏi tiếp")

    await expect(built.chat.resolveAction(USER, "a1", "confirm")).rejects.toBeInstanceOf(
      ConflictException,
    )

    await first.cancel()
  })

  it("cancel gives the conversation back when the answer is never read", async () => {
    const built = buildChat()
    await say(built, CREATE)

    const run = await built.chat.resolveAction(USER, "a1", "confirm")
    expect(built.chat.isBusy(CONVERSATION)).toBe(true)
    await run.cancel()

    expect(built.chat.isBusy(CONVERSATION)).toBe(false)
  })

  it("answers 503 without a model", async () => {
    const built = buildChat({ llm: null })
    await expect(built.chat.resolveAction(USER, "a1", "confirm")).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    )
  })
})

describe("when the answer after a decision fails", () => {
  it("keeps the change that was made and the result, and tells the person", async () => {
    const llm = new ScriptedLlmClient([
      toolCallResponse([{ id: "w1", name: "like_tracks", args: { trackIds: ["t1"] } }]),
      new LlmRateLimitedError(),
    ])
    const built = buildChat({ llm })
    await say(built, "thích bài này")

    const events = await answer(built, "confirm")

    expect(built.tools.mocks.likeTracks).toHaveBeenCalledTimes(1)
    expect(types(events)).toEqual(["tool_result", "error"])
    expect(events[1]).toMatchObject({ code: "assistant_busy" })
    // The result stays, so the next message continues from a valid conversation.
    expect(built.conversations.messages.map((m) => m.parts[0].type)).toEqual([
      "text",
      "tool_call",
      "tool_result",
    ])
    expect(built.usage.state.used).toBe(1)
    expect(built.actions.state.rows.get("a1")?.status).toBe("CONFIRMED")
  })

  it("takes back the proposal when the message that made it is given up", async () => {
    const built = buildChat()
    const run = await built.chat.start(USER, CONVERSATION, CREATE)
    const events = run.events(new AbortController().signal)

    await events.next() // text
    await events.next() // tool_call
    const required = await events.next() // action_required, before done
    expect(required.value).toMatchObject({ type: "action_required" })
    await events.return()

    expect(built.actions.state.rows.size).toBe(0)
    expect(built.conversations.messages).toEqual([])
    expect(built.usage.state.used).toBe(0)
  })
})

describe("every kind of change", () => {
  it("like_tracks and follow_artist run after a yes", async () => {
    const llm = new ScriptedLlmClient([
      toolCallResponse([{ id: "w1", name: "like_tracks", args: { trackIds: ["t1", "t2"] } }]),
      "Đã thích.",
      toolCallResponse([{ id: "w2", name: "follow_artist", args: { artistId: "artist-t1" } }]),
      "Đã theo dõi.",
    ])
    const built = buildChat({ llm })

    await say(built, "thích hai bài")
    await answer(built, "confirm", "a1")
    await say(built, "theo dõi nghệ sĩ")
    await answer(built, "confirm", "a2")

    expect([...built.tools.state.liked]).toEqual(["t1", "t2"])
    expect([...built.tools.state.followed]).toEqual(["artist-t1"])
  })

  it("add_tracks_to_playlist goes to the user's own playlist after a yes", async () => {
    const llm = new ScriptedLlmClient([
      toolCallResponse([
        {
          id: "w1",
          name: "add_tracks_to_playlist",
          args: { playlistId: "mine", trackIds: ["t3"] },
        },
      ]),
      "Đã thêm.",
    ])
    const built = buildChat({ llm })

    await say(built, "thêm bài vào playlist của mình")
    await answer(built, "confirm")

    expect(built.tools.state.added).toEqual([{ playlistId: "mine", trackIds: ["t3"] }])
  })
})
