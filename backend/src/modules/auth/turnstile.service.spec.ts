import { afterEach, describe, expect, it, jest } from "@jest/globals"
import { BadRequestException, Logger, ServiceUnavailableException } from "@nestjs/common"
import type { ConfigService } from "@nestjs/config"
import { TurnstileService } from "./turnstile.service.js"

const SECRET = "0x4AAAAAAF0pCDx-SgZEXiN7Y5lR8oAib0k"

function makeService(env: Record<string, string | undefined>) {
  const config = { get: (key: string) => env[key] } as unknown as ConfigService
  return new TurnstileService(config)
}

function answer(body: Record<string, unknown>, status = 200) {
  return jest
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response(JSON.stringify(body), { status }))
}

describe("TurnstileService", () => {
  jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined)
  jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined)

  afterEach(() => {
    jest.restoreAllMocks()
    jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined)
    jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined)
  })

  describe("without a secret key (development)", () => {
    it("is disabled and lets every call through without asking Cloudflare", async () => {
      const fetchSpy = jest.spyOn(globalThis, "fetch")
      const service = makeService({ TURNSTILE_SECRET_KEY: "  " })
      expect(service.enabled).toBe(false)
      await expect(service.verify(undefined, "login")).resolves.toBeUndefined()
      expect(fetchSpy).not.toHaveBeenCalled()
    })
  })

  describe("with a secret key", () => {
    const service = () => makeService({ TURNSTILE_SECRET_KEY: SECRET })

    it.each([undefined, "", "   ", "x".repeat(2049)])(
      "refuses a missing or malformed token (%p) without asking Cloudflare",
      async (token) => {
        const fetchSpy = jest.spyOn(globalThis, "fetch")
        await expect(service().verify(token, "login")).rejects.toBeInstanceOf(BadRequestException)
        expect(fetchSpy).not.toHaveBeenCalled()
      },
    )

    it("sends the secret, the token and the visitor IP to Siteverify", async () => {
      const fetchSpy = answer({ success: true, action: "login", hostname: "localhost" })
      await service().verify("token-1", "login", "203.0.113.7")
      const [url, init] = fetchSpy.mock.calls[0]
      expect(url).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify")
      expect(JSON.parse(String(init?.body))).toEqual({
        secret: SECRET,
        response: "token-1",
        remoteip: "203.0.113.7",
      })
    })

    it("accepts a successful answer for the expected action", async () => {
      answer({ success: true, action: "login", hostname: "localhost" })
      await expect(service().verify("token", "login")).resolves.toBeUndefined()
    })

    it("accepts an answer without an action (Cloudflare's test keys send none)", async () => {
      answer({ success: true, hostname: "example.com" })
      await expect(service().verify("token", "login")).resolves.toBeUndefined()
    })

    it("refuses an unsuccessful answer (invalid, expired or reused token)", async () => {
      answer({ success: false, "error-codes": ["timeout-or-duplicate"] })
      await expect(service().verify("token", "login")).rejects.toBeInstanceOf(BadRequestException)
    })

    it("refuses a token solved for another action", async () => {
      answer({ success: true, action: "register", hostname: "localhost" })
      await expect(service().verify("token", "login")).rejects.toBeInstanceOf(BadRequestException)
    })

    it.each([
      [
        "a network error",
        () => jest.spyOn(globalThis, "fetch").mockRejectedValue(new Error("down")),
      ],
      ["an HTTP error", () => answer({}, 500)],
    ])("answers 503 when Siteverify fails with %s", async (_label, fail) => {
      fail()
      await expect(service().verify("token", "login")).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      )
    })
  })

  describe("when Cloudflare rejects the request itself", () => {
    const service = () => makeService({ TURNSTILE_SECRET_KEY: SECRET })

    it("answers 503 and logs the reason, pointing at the secret key when that is the cause", async () => {
      const logged = jest.spyOn(Logger.prototype, "error")
      logged.mockClear()
      answer({ success: false, "error-codes": ["invalid-input-secret"] }, 400)

      await expect(service().verify("token", "login")).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      )

      const text = logged.mock.calls.map((call) => String(call[0])).join(" | ")
      expect(text).toContain("400")
      expect(text).toContain("invalid-input-secret")
      expect(text).toContain("TURNSTILE_SECRET_KEY")
      expect(text).not.toContain(SECRET)
    })

    it("still logs the status when the body cannot be read", async () => {
      const logged = jest.spyOn(Logger.prototype, "error")
      logged.mockClear()
      jest
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(new Response("<html>bad gateway</html>", { status: 502 }))

      await expect(service().verify("token", "login")).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      )

      expect(logged.mock.calls.map((call) => String(call[0])).join(" | ")).toContain("502")
    })
  })

  describe("with allowed hostnames", () => {
    const service = () =>
      makeService({
        TURNSTILE_SECRET_KEY: SECRET,
        TURNSTILE_ALLOWED_HOSTNAMES: "musicstream.app, LocalHost",
      })

    it("accepts a token from a listed hostname, ignoring case", async () => {
      answer({ success: true, action: "login", hostname: "localhost" })
      await expect(service().verify("token", "login")).resolves.toBeUndefined()
    })

    it("refuses a token from any other hostname", async () => {
      answer({ success: true, action: "login", hostname: "evil.example" })
      await expect(service().verify("token", "login")).rejects.toBeInstanceOf(BadRequestException)
    })
  })
})
