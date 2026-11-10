import { describe, expect, it } from "@jest/globals"
import { ApiError } from "@/api/client"
import { describeApiError, isNotFound } from "@/utils/apiErrors"
import { describeAuthError } from "@/utils/authErrors"
import { t } from "@/i18n"

const http = (status: number, message = "Server said no") =>
  new ApiError({ status, kind: "http", message })
const offline = new ApiError({ status: 0, kind: "network", message: t("errors.network") })
const slow = new ApiError({ status: 0, kind: "timeout", message: t("errors.timeout") })

describe("describeApiError", () => {
  it("shows the server's message for a 4xx answer", () => {
    expect(describeApiError(http(404, "Track not found"))).toBe("Track not found")
  })

  it("has its own sentence for 429 and for server trouble", () => {
    expect(describeApiError(http(429, "ThrottlerException"))).toBe(t("errors.tooManyRequests"))
    expect(describeApiError(http(500, "stack trace"))).toBe(t("errors.server"))
    expect(describeApiError(http(503, "x"))).toBe(t("errors.server"))
  })

  it("keeps the translated message of connection problems", () => {
    expect(describeApiError(offline)).toBe(t("errors.network"))
    expect(describeApiError(slow)).toBe(t("errors.timeout"))
  })

  it("falls back to a generic sentence for anything else", () => {
    expect(describeApiError(new Error("boom"))).toBe(t("errors.unknown"))
    expect(describeApiError("text")).toBe(t("errors.unknown"))
    expect(describeApiError(http(400, ""))).toBe(t("errors.unknown"))
  })
})

describe("isNotFound", () => {
  it("is true only for a 404 from the API", () => {
    expect(isNotFound(http(404))).toBe(true)
    expect(isNotFound(http(500))).toBe(false)
    expect(isNotFound(new Error("404"))).toBe(false)
  })
})

describe("describeAuthError", () => {
  it("says the credentials are wrong on a login 401", () => {
    expect(describeAuthError(http(401), "login")).toBe(t("auth.errors.invalidCredentials"))
  })

  it("reports a failed security check (400) and an unreachable one (503) on login", () => {
    expect(describeAuthError(http(400, "Security check failed"), "login")).toBe(
      t("auth.errors.turnstileFailed"),
    )
    expect(describeAuthError(http(503, "unavailable"), "login")).toBe(
      t("auth.errors.turnstileUnavailable"),
    )
  })

  it("says the email is taken on a 409", () => {
    expect(describeAuthError(http(409), "register")).toBe(t("auth.errors.emailTaken"))
  })

  it("does not call a register 400 a security failure, it shows the server's message", () => {
    expect(describeAuthError(http(400, "email must be an email"), "register")).toBe(
      "email must be an email",
    )
  })

  it("treats 429 and 5xx like the rest of the app", () => {
    expect(describeAuthError(http(429), "login")).toBe(t("errors.tooManyRequests"))
    expect(describeAuthError(http(500), "register")).toBe(t("errors.server"))
  })

  it("keeps connection messages and hides unknown errors", () => {
    expect(describeAuthError(offline, "login")).toBe(t("errors.network"))
    expect(describeAuthError(new Error("boom"), "login")).toBe(t("errors.unknown"))
  })
})
