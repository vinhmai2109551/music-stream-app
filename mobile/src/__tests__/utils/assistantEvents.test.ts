import { describe, expect, it } from "@jest/globals"
import { parseAssistantEvent } from "@/utils/assistantEvents"

const parse = (event: string, data: unknown) =>
  parseAssistantEvent({ event, data: typeof data === "string" ? data : JSON.stringify(data) })

// The fields the rows of the app read.
const track = (id: string) => ({
  id,
  title: "Lạc Trôi",
  artist: "Sơn Tùng",
  plays: 10,
  duration: 200,
})
const artist = (id: string) => ({ id, name: "Sơn Tùng", followers: 5 })
const album = (id: string) => ({ id, title: "Album", artist: "Sơn Tùng" })
const playlist = (id: string) => ({ id, name: "Chạy bộ", owner: "Bạn", trackIds: ["t1"] })

describe("the events the app understands", () => {
  it("text_delta", () => {
    expect(parse("text_delta", { text: "Xin " })).toEqual({ type: "text_delta", text: "Xin " })
  })

  it("keeps the spaces and line breaks of a text_delta", () => {
    expect(parse("text_delta", { text: "  a\n" })).toEqual({ type: "text_delta", text: "  a\n" })
  })

  it("tool_call", () => {
    expect(parse("tool_call", { callId: "c1", name: "search_catalog", args: { q: "x" } })).toEqual({
      type: "tool_call",
      callId: "c1",
      name: "search_catalog",
    })
  })

  it("tool_result with its cards", () => {
    const event = parse("tool_result", {
      callId: "c1",
      name: "search_catalog",
      ok: true,
      display: {
        tracks: [track("t1")],
        artists: [artist("a1")],
        albums: [album("b1")],
        playlists: [playlist("p1")],
        sources: [{ source: "premium", heading: "Quyền lợi" }],
      },
    })
    expect(event).toMatchObject({
      type: "tool_result",
      ok: true,
      display: {
        tracks: [track("t1")],
        artists: [artist("a1")],
        albums: [album("b1")],
        playlists: [playlist("p1")],
        sources: [{ source: "premium", heading: "Quyền lợi" }],
      },
    })
  })

  it("leaves out the items it could not draw, and keeps the others", () => {
    const event = parse("tool_result", {
      callId: "c",
      name: "n",
      ok: true,
      display: {
        tracks: [
          track("good"),
          { id: "no-title", artist: "x", plays: 1, duration: 1 },
          { ...track("bad-number"), duration: "200" },
          { ...track("nan"), plays: null },
          "x",
          null,
        ],
        artists: [{ id: "a", name: 5, followers: 1 }],
        playlists: [{ ...playlist("p"), trackIds: [1] }],
      },
    })

    expect(event).toMatchObject({
      display: { tracks: [track("good")], artists: [], playlists: [] },
    })
  })

  it("tool_result without cards, or with cards that are empty or broken", () => {
    expect(parse("tool_result", { callId: "c", name: "n", ok: false })).toMatchObject({
      ok: false,
      display: undefined,
    })
    expect(
      parse("tool_result", { callId: "c", name: "n", ok: true, display: { tracks: [] } }),
    ).toMatchObject({ display: { tracks: [] } })
    expect(
      parse("tool_result", {
        callId: "c",
        name: "n",
        ok: true,
        display: { tracks: "x", sources: 3 },
      }),
    ).toMatchObject({ display: undefined })
  })

  it("drops sources that are not a pair of texts", () => {
    const event = parse("tool_result", {
      callId: "c",
      name: "search_help",
      ok: true,
      display: { sources: [{ source: "a", heading: "b" }, { source: 1 }, "x", null] },
    })
    expect(event).toMatchObject({ display: { sources: [{ source: "a", heading: "b" }] } })
  })

  it("tool_result that answers a proposed change", () => {
    expect(
      parse("tool_result", {
        callId: "w1",
        name: "create_playlist",
        ok: true,
        action: { id: "a1", status: "CONFIRMED" },
      }),
    ).toMatchObject({ action: { id: "a1", status: "CONFIRMED" } })
    expect(
      parse("tool_result", {
        callId: "w1",
        name: "n",
        ok: false,
        action: { id: "a1", status: "REJECTED" },
      }),
    ).toMatchObject({ action: { id: "a1", status: "REJECTED" } })
  })

  it("ignores an action whose status the app does not know", () => {
    const event = parse("tool_result", {
      callId: "w1",
      name: "n",
      ok: true,
      action: { id: "a1", status: "PENDING" },
    })
    expect(event).not.toHaveProperty("action")
  })

  it("treats ok as false unless it is exactly true", () => {
    expect(parse("tool_result", { callId: "c", name: "n", ok: "true" })).toMatchObject({
      ok: false,
    })
    expect(parse("tool_result", { callId: "c", name: "n" })).toMatchObject({ ok: false })
  })

  it("action_required", () => {
    expect(
      parse("action_required", {
        actionId: "a1",
        callId: "w1",
        tool: "create_playlist",
        summary: "Tạo playlist",
        input: { name: "x" },
        expiresAt: "2026-11-09T12:00:00Z",
      }),
    ).toEqual({
      type: "action_required",
      actionId: "a1",
      callId: "w1",
      tool: "create_playlist",
      summary: "Tạo playlist",
      expiresAt: "2026-11-09T12:00:00Z",
    })
  })

  it("client_action play_tracks", () => {
    expect(
      parse("client_action", { action: "play_tracks", trackIds: ["t1"], tracks: [track("t1")] }),
    ).toMatchObject({ type: "client_action", trackIds: ["t1"], tracks: [track("t1")] })
  })

  it("client_action leaves out tracks the player could not use", () => {
    expect(
      parse("client_action", {
        action: "play_tracks",
        trackIds: ["t1", "t2"],
        tracks: [track("t1"), { id: "t2" }, 7],
      }),
    ).toMatchObject({ tracks: [track("t1")] })
  })

  it("done", () => {
    expect(parse("done", { messageId: "m1", truncated: true, awaitingAction: false })).toEqual({
      type: "done",
      messageId: "m1",
      truncated: true,
      awaitingAction: false,
    })
    expect(parse("done", { messageId: "m1" })).toMatchObject({
      truncated: false,
      awaitingAction: false,
    })
  })

  it("error", () => {
    expect(parse("error", { code: "assistant_busy", message: "Quá tải" })).toEqual({
      type: "error",
      code: "assistant_busy",
      message: "Quá tải",
    })
  })
})

describe("what it ignores", () => {
  it("an event it does not know (a newer server may send more)", () => {
    expect(parse("something_new", { a: 1 })).toBeNull()
  })

  it("data that is not JSON, or not an object", () => {
    expect(parse("text_delta", "not json")).toBeNull()
    expect(parse("text_delta", "")).toBeNull()
    expect(parse("text_delta", '"text"')).toBeNull()
    expect(parse("text_delta", "[1]")).toBeNull()
    expect(parse("text_delta", "null")).toBeNull()
  })

  it.each([
    ["text_delta", { text: 1 }],
    ["tool_call", { callId: "c" }],
    ["tool_call", { name: "n" }],
    ["tool_result", { name: "n", ok: true }],
    ["action_required", { actionId: "a", callId: "c", tool: "t", summary: "s" }],
    ["client_action", { action: "play_tracks", trackIds: [1], tracks: [] }],
    ["client_action", { action: "play_tracks", trackIds: [], tracks: "x" }],
    ["client_action", { action: "open_url", trackIds: [], tracks: [] }],
    ["done", { truncated: false }],
    ["error", { code: "x" }],
  ])("%s with a missing or wrong field: %j", (event, data) => {
    expect(parse(event, data)).toBeNull()
  })
})
