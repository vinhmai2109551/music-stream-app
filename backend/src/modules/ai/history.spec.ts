import { describe, expect, it } from "@jest/globals"
import { windowHistory, type StoredMessage } from "./history.js"

const say = (text: string): StoredMessage => ({ role: "user", parts: [{ type: "text", text }] })
const reply = (text: string): StoredMessage => ({
  role: "assistant",
  parts: [{ type: "text", text }],
})
const call = (id: string): StoredMessage => ({
  role: "assistant",
  parts: [
    { type: "opaque", provider: "gemini", data: { type: "thought", signature: "s" } },
    { type: "tool_call", id, name: "search_catalog", args: {} },
  ],
})
const result = (id: string): StoredMessage => ({
  role: "user",
  parts: [{ type: "tool_result", callId: id, name: "search_catalog", result: [] }],
})

const texts = (messages: readonly { parts: { type: string; text?: string }[] }[]) =>
  messages.map((m) => m.parts.map((p) => p.text ?? p.type).join("|"))

describe("windowHistory", () => {
  it("returns everything when it fits", () => {
    const all = [say("a"), reply("b"), say("c")]
    expect(windowHistory(all, 20)).toEqual(all)
  })

  it("returns nothing for nothing", () => {
    expect(windowHistory([], 20)).toEqual([])
  })

  it("keeps the last messages and starts at one the person wrote", () => {
    const all = [say("1"), reply("2"), say("3"), reply("4"), say("5")]

    expect(texts(windowHistory(all, 4))).toEqual(["3", "4", "5"])
    expect(texts(windowHistory(all, 3))).toEqual(["3", "4", "5"])
    expect(texts(windowHistory(all, 2))).toEqual(["5"])
  })

  it("never starts with an answer", () => {
    const window = windowHistory([say("1"), reply("2"), say("3"), reply("4")], 3)
    expect(window[0].role).toBe("user")
  })

  it("does not start with a tool result whose call was cut off", () => {
    const all = [say("q"), call("c1"), result("c1"), reply("answer"), say("next")]

    const window = windowHistory(all, 3) // result, answer, next

    expect(texts(window)).toEqual(["next"])
  })

  it("keeps a call together with its result when both fit", () => {
    const all = [say("q"), call("c1"), result("c1"), reply("answer")]

    expect(windowHistory(all, 4)).toEqual(all)
  })

  it("falls back to the newest question when the window holds only tool traffic", () => {
    const all = [say("q"), call("1"), result("1"), call("2"), result("2")]

    const window = windowHistory(all, 2)

    expect(window).toEqual(all)
    expect(window[0]).toEqual(say("q"))
  })

  it("gives nothing when nobody ever asked (only tool traffic)", () => {
    expect(windowHistory([call("1"), result("1")], 20)).toEqual([])
  })

  it("keeps the reasoning parts of the model as they are", () => {
    const window = windowHistory([say("q"), call("c1"), result("c1")], 20)
    expect(window[1].parts[0]).toEqual({
      type: "opaque",
      provider: "gemini",
      data: { type: "thought", signature: "s" },
    })
  })

  it("does not change the list it is given", () => {
    const all = [say("1"), reply("2"), say("3")]
    const copy = [...all]
    windowHistory(all, 1)
    expect(all).toEqual(copy)
  })
})
