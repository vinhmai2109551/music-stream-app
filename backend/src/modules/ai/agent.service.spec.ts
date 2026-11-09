import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import { Logger } from "@nestjs/common"
import { LlmRateLimitedError, type LlmMessage } from "../../shared/llm/llm-client.js"
import { ScriptedLlmClient, toolCallResponse } from "../../shared/llm/scripted-llm-client.js"
import type { AgentTurn } from "./agent.service.js"
import type { ChatEvent } from "./chat-events.js"
import { buildChat, CONVERSATION, USER } from "./testing/fakes.js"
import { MAX_TOOL_CALLS } from "./ai.config.js"

const ask = (text: string): LlmMessage => ({ role: "user", parts: [{ type: "text", text }] })

function setup(script: ConstructorParameters<typeof ScriptedLlmClient>[0]) {
  const llm = new ScriptedLlmClient(script)
  const built = buildChat({ llm })
  const turn = (history: LlmMessage[] = [ask("nhạc buồn")]): AgentTurn => ({
    userId: USER,
    conversationId: CONVERSATION,
    history,
    signal: new AbortController().signal,
    record: { messageIds: [], actionIds: [] },
  })
  const run = async (agentTurn = turn()) => {
    const events: ChatEvent[] = []
    for await (const event of built.agent.run(agentTurn)) events.push(event)
    return { events, turn: agentTurn }
  }
  return { ...built, llm, turn, run }
}

const types = (events: ChatEvent[]) => events.map((event) => event.type)
const search = (id: string, query = "mưa") => ({ id, name: "search_catalog", args: { query } })

beforeEach(() => {
  jest.restoreAllMocks()
  jest.spyOn(Logger.prototype, "log").mockImplementation(() => undefined)
  jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined)
  jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined)
})

describe("AgentService without tools", () => {
  it("streams the answer and saves it", async () => {
    const { run, conversations } = setup(["Xin chào bạn"])

    const { events, turn } = await run()

    expect(types(events)).toEqual(["text_delta", "text_delta", "text_delta", "done"])
    expect(events[events.length - 1]).toMatchObject({ type: "done", awaitingAction: false })
    expect(conversations.messages).toHaveLength(1)
    expect(turn.record.messageIds).toHaveLength(1)
  })

  it("offers every tool to the model", async () => {
    const { run, llm, registry } = setup(["Chào"])

    await run()

    expect(llm.requests[0].tools?.map((tool) => tool.name)).toEqual(
      registry.tools.map((tool) => tool.name),
    )
  })

  it("says so when the model has nothing to say", async () => {
    const { run, conversations } = setup([
      {
        message: { role: "assistant", parts: [] },
        finish: "stop",
        requests: 1,
        usage: { inputTokens: 1, outputTokens: 0, thoughtTokens: 0, totalTokens: 1 },
      },
    ])

    const { events } = await run()

    expect(events).toEqual([expect.objectContaining({ type: "error", code: "empty_answer" })])
    expect(conversations.messages).toHaveLength(0)
  })

  it("does not change the history it is given", async () => {
    const { run, turn } = setup([toolCallResponse([search("c1")]), "Xong"])
    const agentTurn = turn()
    const before = [...agentTurn.history]

    await run(agentTurn)

    expect(agentTurn.history).toEqual(before)
  })
})

describe("AgentService with tools that read", () => {
  it("runs the tool, shows the cards, and goes on with the result", async () => {
    const { run, llm, conversations } = setup([
      toolCallResponse([search("c1")], "Để mình tìm."),
      "Đây là vài bài hợp.",
    ])

    const { events } = await run()

    // "Để ", "mình ", "tìm." then the call and its card, then the five words of the answer.
    expect(types(events)).toEqual([
      ...Array(3).fill("text_delta"),
      "tool_call",
      "tool_result",
      ...Array(5).fill("text_delta"),
      "done",
    ])
    expect(events[3]).toEqual({
      type: "tool_call",
      callId: "c1",
      name: "search_catalog",
      args: { query: "mưa" },
    })
    const result = events[4]
    expect(result).toMatchObject({ type: "tool_result", callId: "c1", ok: true })
    if (result.type !== "tool_result") throw new Error("no result")
    expect(result.display?.tracks?.map((t) => t.id)).toEqual(["t1", "t2", "t3", "t4", "t5"])
    // Saved in order: the assistant asks, the tool answers, the assistant says.
    expect(
      conversations.messages.map((m) => [m.role, m.parts.map((p) => p.type).join("+")]),
    ).toEqual([
      ["assistant", "text+tool_call"],
      ["user", "tool_result"],
      ["assistant", "text"],
    ])
    // The model is given the result in its next request, tied to its call.
    const second = llm.requests[1].messages
    expect(second[second.length - 1]).toMatchObject({
      role: "user",
      parts: [{ type: "tool_result", callId: "c1", name: "search_catalog" }],
    })
  })

  it("keeps the cards with the stored result, for when the conversation is opened again", async () => {
    const { run, conversations } = setup([toolCallResponse([search("c1")]), "Xong"])

    await run()

    const stored = conversations.messages[1].parts[0] as { display?: { tracks: string[] } }
    expect(stored.display?.tracks).toEqual(["t1", "t2", "t3", "t4", "t5"])
  })

  it("gives all the results of one round to the model in one message, in order", async () => {
    const { run, llm, conversations } = setup([
      toolCallResponse([search("a"), { id: "b", name: "get_track", args: { id: "t1" } }]),
      "Xong",
    ])

    const { events } = await run()

    expect(events.filter((e) => e.type === "tool_call")).toHaveLength(2)
    expect(conversations.messages[1].parts.map((p) => (p as { callId: string }).callId)).toEqual([
      "a",
      "b",
    ])
    expect(llm.requests[1].messages[llm.requests[1].messages.length - 1].parts).toHaveLength(2)
  })

  it("asks the app to play tracks, with the tracks themselves", async () => {
    const { run } = setup([
      toolCallResponse([{ id: "p", name: "play_tracks", args: { trackIds: ["t2", "t1"] } }]),
      "Đang phát.",
    ])

    const { events } = await run()

    const action = events.find((e) => e.type === "client_action")
    expect(action).toMatchObject({ action: "play_tracks", trackIds: ["t2", "t1"] })
    if (action?.type !== "client_action") throw new Error("no action")
    expect(action.tracks.map((t) => t.id)).toEqual(["t2", "t1"])
    // The action comes before the card of the result.
    expect(types(events).indexOf("client_action")).toBeLessThan(
      types(events).indexOf("tool_result"),
    )
  })

  it("tells the model when a tool does not exist, and goes on", async () => {
    const { run, llm } = setup([
      toolCallResponse([{ id: "x", name: "delete_everything", args: {} }]),
      "Xin lỗi.",
    ])

    const { events } = await run()

    expect(events.find((e) => e.type === "tool_result")).toMatchObject({ ok: false })
    const result = llm.requests[1].messages[llm.requests[1].messages.length - 1].parts[0]
    expect(result).toMatchObject({ type: "tool_result", isError: true })
    expect(JSON.stringify(result)).toContain("There is no tool called")
  })

  it("tells the model what was wrong with the arguments, so that it can fix the call", async () => {
    const { run, llm } = setup([
      toolCallResponse([{ id: "x", name: "search_catalog", args: { limit: 99 } }]),
      "Thử lại.",
    ])

    await run()

    const result = JSON.stringify(
      llm.requests[1].messages[llm.requests[1].messages.length - 1].parts[0],
    )
    expect(result).toContain('"query\\" is required')
  })

  it("tells the model only that a tool broke, and logs why", async () => {
    const { run, llm, tools } = setup([toolCallResponse([search("x")]), "Xin lỗi."])
    tools.mocks.searchTracks.mockRejectedValueOnce(new Error("password=hunter2 at db:5432"))

    await run()

    const result = JSON.stringify(
      llm.requests[1].messages[llm.requests[1].messages.length - 1].parts[0],
    )
    expect(result).toContain("did not work")
    expect(result).not.toMatch(/hunter2|5432/)
    expect(Logger.prototype.error).toHaveBeenCalledWith(expect.stringContaining("hunter2"))
  })
})

describe("AgentService limit of tools", () => {
  it(`runs at most ${MAX_TOOL_CALLS} tools, then asks for the answer without offering any`, async () => {
    const rounds = Array.from({ length: MAX_TOOL_CALLS }, (_, i) =>
      toolCallResponse([search(`c${i}`)]),
    )
    const { run, llm } = setup([...rounds, "Đây là câu trả lời."])

    const { events } = await run()

    expect(events.filter((e) => e.type === "tool_call")).toHaveLength(MAX_TOOL_CALLS)
    expect(llm.requests).toHaveLength(MAX_TOOL_CALLS + 1)
    expect(llm.requests.slice(0, MAX_TOOL_CALLS).every((r) => r.tools !== undefined)).toBe(true)
    expect(llm.requests[MAX_TOOL_CALLS].tools).toBeUndefined()
    expect(events[events.length - 1]).toMatchObject({ type: "done" })
  })

  it("answers the calls beyond the limit with an error, without running them", async () => {
    const eight = Array.from({ length: 8 }, (_, i) => search(`c${i}`))
    const { run, llm, tools, conversations } = setup([toolCallResponse(eight), "Xong"])

    const { events } = await run()

    expect(events.filter((e) => e.type === "tool_call")).toHaveLength(MAX_TOOL_CALLS)
    expect(tools.mocks.searchTracks).toHaveBeenCalledTimes(MAX_TOOL_CALLS)
    // Every call has a result, as the model requires.
    const results = conversations.messages[1].parts
    expect(results).toHaveLength(8)
    expect(results.slice(MAX_TOOL_CALLS).every((p) => (p as { isError?: boolean }).isError)).toBe(
      true,
    )
    expect(llm.requests[1].tools).toBeUndefined()
  })

  it("does not let the model go round forever when it keeps asking with no tools offered", async () => {
    const asking = toolCallResponse([search("x")])
    const { run, llm } = setup([
      ...Array.from({ length: MAX_TOOL_CALLS }, () => asking),
      toolCallResponse([search("last")], "Câu trả lời cuối."),
    ])

    const { events } = await run()

    // With no tools offered a call is ignored; the text that came with it is the answer.
    expect(events[events.length - 1]).toMatchObject({ type: "done", awaitingAction: false })
    expect(llm.requests).toHaveLength(MAX_TOOL_CALLS + 1)
  })
})

describe("AgentService with tools that change the data", () => {
  const create = (id: string, extra: Record<string, unknown> = {}) => ({
    id,
    name: "create_playlist",
    args: { name: "Chạy bộ", trackIds: ["t1", "t2"], ...extra },
  })

  it("proposes the change, stops, and does not change anything", async () => {
    const { run, llm, actions, tools, conversations } = setup([
      toolCallResponse([create("w1")], "Mình sẽ tạo playlist."),
    ])

    const { events, turn } = await run()

    expect(types(events)).toEqual([
      "text_delta",
      "text_delta",
      "text_delta",
      "text_delta",
      "tool_call",
      "action_required",
      "done",
    ])
    const required = events.find((e) => e.type === "action_required")
    expect(required).toMatchObject({
      callId: "w1",
      tool: "create_playlist",
      summary: "Tạo playlist “Chạy bộ” gồm 2 bài: “Bài t1”, “Bài t2”",
      input: { name: "Chạy bộ", trackIds: ["t1", "t2"] },
    })
    expect(events[events.length - 1]).toMatchObject({ type: "done", awaitingAction: true })
    expect(tools.mocks.createPlaylist).not.toHaveBeenCalled()
    expect(llm.requests).toHaveLength(1)
    expect(actions.state.rows.size).toBe(1)
    expect(turn.record.actionIds).toHaveLength(1)
    // The question and the proposal are in the history; there is no result for the call yet.
    expect(conversations.messages).toHaveLength(1)
  })

  it("gives the expiry time of 10 minutes", async () => {
    const { run } = setup([toolCallResponse([create("w1")])])
    const before = Date.now()

    const { events } = await run()

    const required = events.find((e) => e.type === "action_required")
    if (required?.type !== "action_required") throw new Error("none")
    const minutes = (new Date(required.expiresAt).getTime() - before) / 60_000
    expect(minutes).toBeGreaterThan(9.9)
    expect(minutes).toBeLessThan(10.1)
  })

  it("runs the reads of the same round and proposes only the first change", async () => {
    const { run, llm, conversations, actions } = setup([
      toolCallResponse([
        search("r1"),
        create("w1"),
        { id: "w2", name: "like_tracks", args: { trackIds: ["t1"] } },
      ]),
    ])

    const { events } = await run()

    expect(types(events).filter((t) => t === "action_required")).toHaveLength(1)
    expect(actions.state.rows.size).toBe(1)
    expect(llm.requests).toHaveLength(1)
    // No result is stored yet: the results of the round wait with the change, so that the model
    // gets them all together in one message once the person has answered.
    expect(conversations.messages).toHaveLength(1)
    const [row] = [...actions.state.rows.values()]
    expect(row.peers.map((p) => p.callId)).toEqual(["r1", "w2"])
    expect(JSON.stringify(row.peers[1])).toContain("Only one change")
  })

  it("tells the model when a change cannot be proposed, and goes on", async () => {
    const { run, actions } = setup([
      toolCallResponse([create("w1", { trackIds: ["t1", "ghost"] })]),
      "Không tìm thấy bài đó.",
    ])

    const { events } = await run()

    expect(events.find((e) => e.type === "tool_result")).toMatchObject({ ok: false })
    expect(types(events)).not.toContain("action_required")
    expect(actions.state.rows.size).toBe(0)
    expect(events[events.length - 1]).toMatchObject({ type: "done", awaitingAction: false })
  })

  it("refuses to propose adding to somebody else's playlist", async () => {
    const { run, actions } = setup([
      toolCallResponse([
        {
          id: "w1",
          name: "add_tracks_to_playlist",
          args: { playlistId: "theirs", trackIds: ["t1"] },
        },
      ]),
      "Không được.",
    ])

    await run()

    expect(actions.state.rows.size).toBe(0)
  })
})

describe("AgentService failures", () => {
  it("lets what the model throws go to the caller, with what was written so far recorded", async () => {
    const { run, turn } = setup([toolCallResponse([search("c1")]), new LlmRateLimitedError()])
    const agentTurn = turn()

    await expect(run(agentTurn)).rejects.toBeInstanceOf(LlmRateLimitedError)

    // The caller takes these back.
    expect(agentTurn.record.messageIds).toHaveLength(2)
  })
})
