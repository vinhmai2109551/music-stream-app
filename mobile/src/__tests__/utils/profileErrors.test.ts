import { describe, expect, it } from "@jest/globals"
import { ApiError } from "@/api/client"
import { describeProfileError } from "@/utils/profileErrors"
import { t } from "@/i18n"

const http = (status: number, message = `server said ${status}`) =>
  new ApiError({ status, kind: "http", message })

describe("describeProfileError", () => {
  it("shows what the server said about a rejected request", () => {
    expect(describeProfileError(http(400, "avatar files can be at most 2 MB"))).toBe(
      "avatar files can be at most 2 MB",
    )
  })

  it("asks to slow down after a rate limit", () => {
    expect(describeProfileError(http(429))).toBe(t("errors.tooManyRequests"))
  })

  it("does not show the text of a server failure", () => {
    expect(describeProfileError(http(500, "stack trace"))).toBe(t("errors.server"))
    expect(describeProfileError(http(503))).toBe(t("errors.server"))
  })

  it.each([
    ["network", t("errors.network")],
    ["timeout", t("errors.timeout")],
    ["network", t("settings.edit.readFailed")],
  ] as const)("keeps the message of a %s problem: %s", (kind, message) => {
    expect(describeProfileError(new ApiError({ status: 0, kind, message }))).toBe(message)
  })

  it("keeps the upload failure message of a refused PUT", () => {
    expect(describeProfileError(http(403, t("settings.edit.uploadFailed")))).toBe(
      t("settings.edit.uploadFailed"),
    )
  })

  it("says something plain for anything else", () => {
    expect(describeProfileError(new Error("boom"))).toBe(t("errors.unknown"))
    expect(describeProfileError("boom")).toBe(t("errors.unknown"))
    expect(describeProfileError(undefined)).toBe(t("errors.unknown"))
  })
})
