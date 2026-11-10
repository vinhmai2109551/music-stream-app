import { describe, expect, it } from "@jest/globals"
import { parseTrustProxy } from "./trust-proxy.js"

describe("parseTrustProxy", () => {
  it("trusts one proxy when TRUST_PROXY is unset or blank", () => {
    expect(parseTrustProxy(undefined)).toBe(1)
    expect(parseTrustProxy("")).toBe(1)
    expect(parseTrustProxy("   ")).toBe(1)
  })

  it("reads a hop count as a number, including 0", () => {
    expect(parseTrustProxy("1")).toBe(1)
    expect(parseTrustProxy("2")).toBe(2)
    expect(parseTrustProxy("0")).toBe(0)
  })

  it("reads true and false as booleans", () => {
    expect(parseTrustProxy("true")).toBe(true)
    expect(parseTrustProxy("false")).toBe(false)
  })

  it("passes address lists to Express untouched", () => {
    expect(parseTrustProxy("loopback, 10.0.0.0/8")).toBe("loopback, 10.0.0.0/8")
    expect(parseTrustProxy(" uniquelocal ")).toBe("uniquelocal")
  })
})
