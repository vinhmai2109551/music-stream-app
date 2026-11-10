import { t } from "@/i18n"
import { describe, expect, it } from "@jest/globals"
import { ApiError } from "@/api/client"
import { describeAssistantError, describeStreamError } from "@/utils/assistantErrors"

const http = (status: number, message = "") => new ApiError({ status, kind: "http", message })
describe("describeAssistantError", () => {
  it("no network or a slow server: offline", () => {
    expect(
      describeAssistantError(new ApiError({ status: 0, kind: "network", message: "x" })),
    ).toEqual({ kind: "offline", message: t("assistant.errors.offline") })
    expect(
      describeAssistantError(new ApiError({ status: 0, kind: "timeout", message: "x" })),
    ).toEqual({ kind: "offline", message: t("assistant.errors.offline") })
  })

  it("429 gives the message of the server (it says if the day is used up)", () => {
    expect(describeAssistantError(http(429, "Bạn đã dùng hết 30 tin nhắn hôm nay"))).toEqual({
      kind: "quota",
      message: "Bạn đã dùng hết 30 tin nhắn hôm nay",
    })
  })

  it("429 without a message falls back to ours", () => {
    expect(describeAssistantError(http(429))).toEqual({
      kind: "quota",
      message: t("assistant.errors.quota"),
    })
  })

  it("503: the assistant is off", () => {
    expect(describeAssistantError(http(503, "Assistant is not configured"))).toEqual({
      kind: "unavailable",
      message: t("assistant.errors.unavailable"),
    })
  })

  it("409: it is still answering the last message", () => {
    expect(describeAssistantError(http(409)).kind).toBe("conflict")
    expect(describeAssistantError(http(409, "Đợi chút")).message).toBe("Đợi chút")
  })

  it("410: the proposal expired", () => {
    expect(describeAssistantError(http(410))).toEqual({
      kind: "expired",
      message: t("assistant.errors.expired"),
    })
  })

  it("404: the conversation is gone", () => {
    expect(describeAssistantError(http(404))).toEqual({
      kind: "gone",
      message: t("assistant.errors.gone"),
    })
  })

  it("anything else is a generic error, and the server's text is not shown", () => {
    expect(describeAssistantError(http(500, "SQL exploded"))).toEqual({
      kind: "generic",
      message: t("assistant.errors.generic"),
    })
    expect(describeAssistantError(new Error("boom"))).toEqual({
      kind: "generic",
      message: t("assistant.errors.generic"),
    })
    expect(describeAssistantError("x")).toEqual({
      kind: "generic",
      message: t("assistant.errors.generic"),
    })
  })
})

describe("describeStreamError", () => {
  it("shows the message the server wrote", () => {
    expect(describeStreamError("assistant_busy", "Trợ lý đang quá tải")).toEqual({
      kind: "busy",
      message: "Trợ lý đang quá tải",
    })
    expect(describeStreamError("assistant_unavailable", "Tạm ngưng").kind).toBe("busy")
  })

  it("is generic for other codes, and for a missing message", () => {
    expect(describeStreamError("boom", "x").kind).toBe("generic")
    expect(describeStreamError("assistant_busy", "")).toEqual({
      kind: "busy",
      message: t("assistant.errors.generic"),
    })
  })
})
