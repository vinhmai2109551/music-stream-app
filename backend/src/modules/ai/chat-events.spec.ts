import { describe, expect, it } from "@jest/globals"
import {
  LlmRateLimitedError,
  LlmRequestError,
  LlmUnavailableError,
} from "../../shared/llm/llm-client.js"
import { BUSY_MESSAGE, describeChatError, toSse } from "./chat-events.js"
import { titleOf } from "./conversations.service.js"

describe("describeChatError", () => {
  it("tells a rate limit as 'the assistant is overloaded', in the words of the spec", () => {
    expect(describeChatError(new LlmRateLimitedError(), false)).toEqual({
      type: "error",
      code: "assistant_busy",
      message: "Trợ lý đang quá tải, thử lại sau ít phút",
    })
    expect(BUSY_MESSAGE).toBe("Trợ lý đang quá tải, thử lại sau ít phút")
  })

  it("tells an outage as unavailable", () => {
    expect(describeChatError(new LlmUnavailableError(), false)).toMatchObject({
      code: "assistant_unavailable",
    })
  })

  it("tells a time-out as a time-out, whatever the error", () => {
    expect(describeChatError(new Error("aborted"), true)).toMatchObject({ code: "timeout" })
    expect(describeChatError(new LlmUnavailableError(), true)).toMatchObject({ code: "timeout" })
  })

  it.each([
    ["a refusal of the provider", new LlmRequestError("API key not valid: AIza-secret", 400)],
    ["a bug", new TypeError("x is not a function")],
    ["something that is not an error", "boom"],
  ])("tells %s as a general error without any detail", (_name, error) => {
    const event = describeChatError(error, false)

    expect(event.code).toBe("assistant_error")
    expect(event.message).not.toMatch(/AIza|x is not|boom|API key/)
  })
})

describe("toSse", () => {
  it("writes an event name, the rest as JSON data, and a blank line", () => {
    expect(toSse({ type: "text_delta", text: "Xin chào" })).toBe(
      'event: text_delta\ndata: {"text":"Xin chào"}\n\n',
    )
    expect(toSse({ type: "done", messageId: "m1", truncated: false, awaitingAction: false })).toBe(
      'event: done\ndata: {"messageId":"m1","truncated":false,"awaitingAction":false}\n\n',
    )
  })

  it("keeps a newline inside the text on one data line (JSON escapes it)", () => {
    const text = toSse({ type: "text_delta", text: "a\nb\n\nc" })

    expect(text.split("\n")).toHaveLength(4) // event, data, "", ""
    expect(text).toContain('"a\\nb\\n\\nc"')
  })
})

describe("titleOf", () => {
  it("is the message, with spaces and line breaks made single", () => {
    expect(titleOf("  Gợi ý\n\n nhạc   buồn ")).toBe("Gợi ý nhạc buồn")
  })

  it("cuts a long message at 60 characters with an ellipsis", () => {
    const title = titleOf("x".repeat(100))
    expect(title).toHaveLength(60)
    expect(title.endsWith("…")).toBe(true)
  })

  it("keeps a message of exactly 60 characters", () => {
    expect(titleOf("y".repeat(60))).toBe("y".repeat(60))
  })
})
