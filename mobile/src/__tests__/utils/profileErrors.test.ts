import { describe, expect, it } from "@jest/globals"
import { ApiError } from "@/api/client"
import { copy } from "@/constants/copy"
import { describeProfileError } from "@/utils/profileErrors"

const http = (status: number, message = `server said ${status}`) =>
  new ApiError({ status, kind: "http", message })

describe("describeProfileError", () => {
  it("shows what the server said about a rejected request", () => {
    expect(describeProfileError(http(400, "avatar files can be at most 2 MB"))).toBe(
      "avatar files can be at most 2 MB",
    )
  })

  it("asks to slow down after a rate limit", () => {
    expect(describeProfileError(http(429))).toBe(copy.errors.tooManyRequests)
  })

  it("does not show the text of a server failure", () => {
    expect(describeProfileError(http(500, "stack trace"))).toBe(copy.errors.server)
    expect(describeProfileError(http(503))).toBe(copy.errors.server)
  })

  it.each([
    ["network", copy.errors.network],
    ["timeout", copy.errors.timeout],
    ["network", copy.account.edit.readFailed],
  ] as const)("keeps the message of a %s problem: %s", (kind, message) => {
    expect(describeProfileError(new ApiError({ status: 0, kind, message }))).toBe(message)
  })

  it("keeps the upload failure message of a refused PUT", () => {
    expect(describeProfileError(http(403, copy.account.edit.uploadFailed))).toBe(
      copy.account.edit.uploadFailed,
    )
  })

  it("says something plain for anything else", () => {
    expect(describeProfileError(new Error("boom"))).toBe(copy.errors.unknown)
    expect(describeProfileError("boom")).toBe(copy.errors.unknown)
    expect(describeProfileError(undefined)).toBe(copy.errors.unknown)
  })
})
