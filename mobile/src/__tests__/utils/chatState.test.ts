import { describe, expect, it } from "@jest/globals"
import type { AssistantEvent, AssistantMessageLine } from "@/api/types"
import {
  chatReducer,
  initialChatState,
  itemsFromHistory,
  type ChatAction,
  type ChatState,
} from "@/utils/chatState"

const NOW = Date.parse("2026-11-09T12:00:00Z")
const FUTURE = "2026-11-09T12:08:00Z"
const PAST = "2026-11-09T11:50:00Z"

const track = (id: string) => ({ id, title: `Bài ${id}` }) as never

function runFrom(start: ChatState, ...actions: ChatAction[]): ChatState {
  return actions.reduce(chatReducer, start)
}
function run(...actions: ChatAction[]): ChatState {
  return runFrom(initialChatState, ...actions)
}
const event = (e: AssistantEvent): ChatAction => ({ type: "event", event: e })
const text = (t: string) => event({ type: "text_delta", text: t })
const done = (extra: Partial<Extract<AssistantEvent, { type: "done" }>> = {}) =>
  event({ type: "done", messageId: "m", truncated: false, awaitingAction: false, ...extra })
const kinds = (state: ChatState) => state.items.map((item) => item.kind)

describe("a message and its answer", () => {
  it("shows the question, then the answer as it is written", () => {
    const state = run({ type: "sent", text: "chào" }, text("Xin "), text("chào"))

    expect(kinds(state)).toEqual(["user", "assistant"])
    expect(state.items[1]).toMatchObject({ text: "Xin chào", streaming: true })
    expect(state.streaming).toBe(true)
  })

  it("ends the answer when it is done", () => {
    const state = run({ type: "sent", text: "chào" }, text("Xin chào"), done())

    expect(state.streaming).toBe(false)
    expect(state.items[1]).toMatchObject({ streaming: false, truncated: false })
  })

  it("marks an answer that was cut short", () => {
    const state = run({ type: "sent", text: "a" }, text("dài"), done({ truncated: true }))
    expect(state.items[1]).toMatchObject({ truncated: true })
  })

  it("clears an earlier error when a new message is sent", () => {
    const failed = run(
      { type: "sent", text: "a" },
      { type: "failed", error: { kind: "offline", message: "x" } },
    )
    expect(failed.error).not.toBeNull()

    expect(chatReducer(failed, { type: "sent", text: "b" }).error).toBeNull()
  })

  it("gives every item its own key", () => {
    const state = run(
      { type: "sent", text: "a" },
      text("x"),
      event({ type: "tool_call", callId: "c1", name: "search_catalog" }),
      event({ type: "tool_call", callId: "c2", name: "get_track" }),
      text("y"),
    )
    const ids = state.items.map((item) => item.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe("tools", () => {
  it("shows a tool at work, then its cards", () => {
    const state = run(
      { type: "sent", text: "nhạc buồn" },
      event({ type: "tool_call", callId: "c1", name: "search_catalog" }),
    )
    expect(state.items[1]).toMatchObject({
      kind: "tool",
      name: "search_catalog",
      status: "running",
    })

    const next = chatReducer(
      state,
      event({
        type: "tool_result",
        callId: "c1",
        name: "search_catalog",
        ok: true,
        display: { tracks: [track("t1")] },
      }),
    )

    expect(next.items[1]).toMatchObject({ status: "done", display: { tracks: [track("t1")] } })
    expect(next.items).toHaveLength(2)
  })

  it("shows a tool that failed", () => {
    const state = run(
      { type: "sent", text: "a" },
      event({ type: "tool_call", callId: "c1", name: "get_track" }),
      event({ type: "tool_result", callId: "c1", name: "get_track", ok: false }),
    )
    expect(state.items[1]).toMatchObject({ status: "failed" })
  })

  it("starts a new paragraph of the answer after the cards", () => {
    const state = run(
      { type: "sent", text: "a" },
      text("Để mình tìm. "),
      event({ type: "tool_call", callId: "c1", name: "search_catalog" }),
      event({ type: "tool_result", callId: "c1", name: "search_catalog", ok: true }),
      text("Đây là kết quả."),
      done(),
    )

    expect(kinds(state)).toEqual(["user", "assistant", "tool", "assistant"])
    expect(state.items[1]).toMatchObject({ text: "Để mình tìm. ", streaming: false })
    expect(state.items[3]).toMatchObject({ text: "Đây là kết quả." })
  })

  it("shows several tools of one round, each with its own result", () => {
    const state = run(
      { type: "sent", text: "a" },
      event({ type: "tool_call", callId: "c1", name: "search_catalog" }),
      event({ type: "tool_call", callId: "c2", name: "get_my_library" }),
      event({ type: "tool_result", callId: "c2", name: "get_my_library", ok: true }),
      event({ type: "tool_result", callId: "c1", name: "search_catalog", ok: false }),
    )
    expect(state.items.slice(1)).toMatchObject([
      { callId: "c1", status: "failed" },
      { callId: "c2", status: "done" },
    ])
  })

  it("adds a card for a result whose call it never saw", () => {
    const state = run(
      { type: "sent", text: "a" },
      event({ type: "tool_result", callId: "x", name: "get_track", ok: true }),
    )
    expect(kinds(state)).toEqual(["user", "tool"])
  })

  it("ends a tool that was still running when the answer is done", () => {
    const state = run(
      { type: "sent", text: "a" },
      event({ type: "tool_call", callId: "c1", name: "search_catalog" }),
      done(),
    )
    expect(state.items[1]).toMatchObject({ status: "done" })
  })

  it("leaves the player to the hook: a client action changes no item", () => {
    const before = run({ type: "sent", text: "phát" })
    const after = chatReducer(
      before,
      event({ type: "client_action", action: "play_tracks", trackIds: ["t1"], tracks: [] }),
    )
    expect(after).toBe(before)
  })

  it("ignores the error event: the hook turns it into a failure with a kind", () => {
    const before = run({ type: "sent", text: "a" })
    expect(chatReducer(before, event({ type: "error", code: "x", message: "y" }))).toBe(before)
  })
})

describe("a change that needs a yes", () => {
  const proposal = (): ChatAction[] => [
    { type: "sent", text: "tạo playlist" },
    event({ type: "tool_call", callId: "w1", name: "create_playlist" }),
    event({
      type: "action_required",
      actionId: "a1",
      callId: "w1",
      tool: "create_playlist",
      summary: "Tạo playlist “Chạy bộ”",
      expiresAt: FUTURE,
    }),
    done({ awaitingAction: true }),
  ]

  it("turns the card of the call into the card to approve", () => {
    const state = run(...proposal())

    expect(kinds(state)).toEqual(["user", "action"])
    expect(state.items[1]).toMatchObject({
      actionId: "a1",
      status: "PENDING",
      summary: "Tạo playlist “Chạy bộ”",
    })
    expect(state.streaming).toBe(false)
  })

  it("adds the card when there was no call before it", () => {
    const state = run(
      { type: "sent", text: "a" },
      event({
        type: "action_required",
        actionId: "a1",
        callId: "w1",
        tool: "like_tracks",
        summary: "Thích 1 bài",
        expiresAt: FUTURE,
      }),
    )
    expect(kinds(state)).toEqual(["user", "action"])
  })

  it("shows the card busy while the answer is on its way", () => {
    const state = run(...proposal(), { type: "answering", actionId: "a1" })

    expect(state.items[1]).toMatchObject({ status: "BUSY" })
    expect(state.streaming).toBe(true)
  })

  it("shows what became of it, with its cards, and then the rest of the answer", () => {
    const state = run(
      ...proposal(),
      { type: "answering", actionId: "a1" },
      event({
        type: "tool_result",
        callId: "w1",
        name: "create_playlist",
        ok: true,
        display: { playlists: [{ id: "p1" } as never] },
        action: { id: "a1", status: "CONFIRMED" },
      }),
      text("Xong rồi."),
      done(),
    )

    expect(kinds(state)).toEqual(["user", "action", "assistant"])
    expect(state.items[1]).toMatchObject({
      status: "CONFIRMED",
      display: { playlists: [{ id: "p1" }] },
    })
    expect(state.items[2]).toMatchObject({ text: "Xong rồi." })
  })

  it("shows a refusal", () => {
    const state = run(
      ...proposal(),
      { type: "answering", actionId: "a1" },
      event({
        type: "tool_result",
        callId: "w1",
        name: "create_playlist",
        ok: false,
        action: { id: "a1", status: "REJECTED" },
      }),
    )
    expect(state.items[1]).toMatchObject({ status: "REJECTED" })
  })

  it("shows a change that was approved but could not be made as failed", () => {
    const state = run(
      ...proposal(),
      { type: "answering", actionId: "a1" },
      event({
        type: "tool_result",
        callId: "w1",
        name: "create_playlist",
        ok: false,
        action: { id: "a1", status: "CONFIRMED" },
      }),
    )
    expect(state.items[1]).toMatchObject({ status: "FAILED" })
  })

  it("puts the card back when the answer could not be sent, and says why", () => {
    const error = { kind: "offline" as const, message: "mất mạng" }
    const state = run(
      ...proposal(),
      { type: "answering", actionId: "a1" },
      {
        type: "actionFailed",
        actionId: "a1",
        status: "PENDING",
        error,
      },
    )

    expect(state.items[1]).toMatchObject({ status: "PENDING" })
    expect(state.streaming).toBe(false)
    expect(state.error).toEqual(error)
  })

  it("shows the card expired when the server says the time is over", () => {
    const state = run(
      ...proposal(),
      { type: "answering", actionId: "a1" },
      {
        type: "actionFailed",
        actionId: "a1",
        status: "EXPIRED",
        error: { kind: "expired", message: "hết hạn" },
      },
    )
    expect(state.items[1]).toMatchObject({ status: "EXPIRED" })
  })

  it("takes back the rest of an answer that failed after the change was made", () => {
    const state = run(
      ...proposal(),
      { type: "answering", actionId: "a1" },
      event({
        type: "tool_result",
        callId: "w1",
        name: "create_playlist",
        ok: true,
        action: { id: "a1", status: "CONFIRMED" },
      }),
      text("Đã tạo"),
      { type: "failed", error: { kind: "busy", message: "quá tải" } },
    )

    expect(kinds(state)).toEqual(["user", "action"])
    expect(state.items[1]).toMatchObject({ status: "CONFIRMED" })
    expect(state.error?.kind).toBe("busy")
  })
})

describe("failing, stopping", () => {
  it("takes back the answer and marks the question as not sent", () => {
    const state = run(
      { type: "sent", text: "hỏi" },
      text("Xin"),
      event({ type: "tool_call", callId: "c1", name: "search_catalog" }),
      { type: "failed", error: { kind: "offline", message: "mất mạng" } },
    )

    expect(kinds(state)).toEqual(["user"])
    expect(state.items[0]).toMatchObject({ failed: true, text: "hỏi" })
    expect(state.streaming).toBe(false)
    expect(state.error).toEqual({ kind: "offline", message: "mất mạng" })
  })

  it("leaves the earlier messages alone", () => {
    const before = run({ type: "sent", text: "một" }, text("a"), done())
    const state = runFrom(before, { type: "sent", text: "hai" }, text("b"), {
      type: "failed",
      error: { kind: "generic", message: "x" },
    })

    expect(kinds(state)).toEqual(["user", "assistant", "user"])
    expect(state.items[0]).toMatchObject({ failed: false })
    expect(state.items[2]).toMatchObject({ failed: true })
  })

  it("takes back the whole turn, question included, when the person presses Stop", () => {
    const before = run({ type: "sent", text: "một" }, text("a"), done())
    const state = runFrom(before, { type: "sent", text: "hai" }, text("b"), { type: "stopped" })

    expect(kinds(state)).toEqual(["user", "assistant"])
    expect(state.streaming).toBe(false)
    expect(state.error).toBeNull()
  })

  it("drops a question that was not sent when the person sends again", () => {
    const failed = run(
      { type: "sent", text: "hỏi" },
      { type: "failed", error: { kind: "offline", message: "x" } },
    )
    const state = runFrom(failed, { type: "sent", text: "hỏi" }, text("Đây"))

    expect(kinds(state)).toEqual(["user", "assistant"])
    expect(state.items[0]).toMatchObject({ failed: false, text: "hỏi" })
    expect(state.turnStart).toBe(0)
  })

  it("dismisses an error", () => {
    const state = run(
      { type: "sent", text: "a" },
      { type: "failed", error: { kind: "generic", message: "x" } },
      { type: "dismissError" },
    )
    expect(state.error).toBeNull()
  })
})

describe("history", () => {
  const line = (extra: Partial<AssistantMessageLine>): AssistantMessageLine => ({
    id: "m",
    role: "assistant",
    text: "",
    createdAt: "2026-11-09T10:00:00Z",
    ...extra,
  })

  it("shows texts and cards in order", () => {
    const items = itemsFromHistory(
      [
        line({ id: "1", role: "user", text: "hỏi" }),
        line({ id: "2", role: "assistant", text: "Để tìm" }),
        line({
          id: "3",
          role: "tool",
          tool: {
            callId: "c1",
            name: "search_catalog",
            ok: true,
            display: { tracks: [track("t1")] },
          },
        }),
        line({ id: "4", role: "assistant", text: "Đây" }),
      ],
      NOW,
    )

    expect(items.map((item) => item.kind)).toEqual(["user", "assistant", "tool", "assistant"])
    expect(items[2]).toMatchObject({ status: "done", name: "search_catalog" })
  })

  it("shows a card of a tool that failed", () => {
    const [item] = itemsFromHistory(
      [line({ role: "tool", tool: { callId: "c", name: "get_track", ok: false } })],
      NOW,
    )
    expect(item).toMatchObject({ kind: "tool", status: "failed" })
  })

  it.each([
    ["a change still waiting", "PENDING", null, FUTURE, "PENDING"],
    [
      "a change whose time is over, though the server has not marked it",
      "PENDING",
      null,
      PAST,
      "EXPIRED",
    ],
    ["a change that was made", "CONFIRMED", true, FUTURE, "CONFIRMED"],
    ["a change that was approved but not made", "CONFIRMED", false, FUTURE, "FAILED"],
    ["a refused change", "REJECTED", false, FUTURE, "REJECTED"],
    ["a change that expired", "EXPIRED", false, FUTURE, "EXPIRED"],
  ] as const)("shows %s", (_name, status, ok, expiresAt, expected) => {
    const [item] = itemsFromHistory(
      [
        line({
          role: "tool",
          tool: {
            callId: "w1",
            name: "create_playlist",
            ok,
            action: { id: "a1", status, summary: "Tạo playlist", expiresAt },
          },
        }),
      ],
      NOW,
    )
    expect(item).toMatchObject({ kind: "action", actionId: "a1", status: expected })
  })

  it("replaces what is shown when a conversation is loaded", () => {
    const state = chatReducer(run({ type: "sent", text: "cũ" }), {
      type: "loaded",
      lines: [line({ id: "1", role: "user", text: "mới" })],
      now: NOW,
    })
    expect(state.items).toHaveLength(1)
    expect(state.items[0]).toMatchObject({ text: "mới" })
    expect(state.streaming).toBe(false)
  })

  it("loading clears an earlier error, reading again after a failure keeps it", () => {
    const error = { kind: "offline" as const, message: "mất mạng" }
    const failed = run({ type: "sent", text: "a" }, { type: "failed", error })
    const lines = [line({ id: "1", role: "user", text: "a" })]

    expect(chatReducer(failed, { type: "loaded", lines, now: NOW }).error).toBeNull()

    const synced = chatReducer(failed, { type: "synced", lines, now: NOW })
    expect(synced.error).toEqual(error)
    expect(synced.items).toMatchObject([{ kind: "user", failed: false }])
    expect(synced.streaming).toBe(false)
  })
})
