import { describe, expect, it } from "@jest/globals"
import type { AssistantEvent } from "@/api/types"
import { chatReducer, initialChatState, type ChatAction, type ChatState } from "@/utils/chatState"

const event = (e: AssistantEvent): ChatAction => ({ type: "event", event: e })
const run = (...actions: ChatAction[]): ChatState => actions.reduce(chatReducer, initialChatState)

/** A proposal, and the person has just answered it. */
const waiting = () =>
  run(
    { type: "sent", text: "tạo" },
    event({
      type: "action_required",
      actionId: "a1",
      callId: "w1",
      tool: "create_playlist",
      summary: "Tạo playlist",
      expiresAt: "2099-01-01T00:00:00Z",
    }),
    event({ type: "done", messageId: "m", truncated: false, awaitingAction: true }),
    { type: "answering", actionId: "a1" },
  )

describe("a proposal whose answer is on its way", () => {
  it("goes back to waiting when the answer fails", () => {
    const state = chatReducer(waiting(), {
      type: "failed",
      error: { kind: "offline", message: "mất mạng" },
    })

    expect(state.items[1]).toMatchObject({ kind: "action", status: "PENDING" })
    expect(state.streaming).toBe(false)
  })

  it("goes back to waiting when the person presses Stop", () => {
    const state = chatReducer(waiting(), { type: "stopped" })
    expect(state.items[1]).toMatchObject({ status: "PENDING" })
  })

  it("shows a verdict the server gave", () => {
    const state = chatReducer(waiting(), {
      type: "actionFailed",
      actionId: "a1",
      status: "EXPIRED",
      error: { kind: "expired", message: "hết hạn" },
    })
    expect(state.items[1]).toMatchObject({ status: "EXPIRED" })
  })

  it("keeps the result when the answer broke after the change was made", () => {
    const decided = chatReducer(
      waiting(),
      event({
        type: "tool_result",
        callId: "w1",
        name: "create_playlist",
        ok: true,
        action: { id: "a1", status: "CONFIRMED" },
      }),
    )

    const failed = chatReducer(decided, { type: "failed", error: { kind: "busy", message: "x" } })
    const stopped = chatReducer(decided, { type: "stopped" })
    const verdict = chatReducer(decided, {
      type: "actionFailed",
      actionId: "a1",
      status: "PENDING",
      error: { kind: "generic", message: "x" },
    })

    for (const state of [failed, stopped, verdict]) {
      expect(state.items[1]).toMatchObject({ status: "CONFIRMED" })
    }
  })
})
