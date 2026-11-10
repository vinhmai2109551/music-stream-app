import { describe, expect, it, jest } from "@jest/globals"

/** The address is read when the module loads, so each case loads it afresh. */
function pageUrlWith(apiUrl: string | undefined): string | undefined {
  const before = process.env.EXPO_PUBLIC_API_URL
  if (apiUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL
  else process.env.EXPO_PUBLIC_API_URL = apiUrl
  jest.resetModules()
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require("@/api/embed") as typeof import("@/api/embed")).youtubePlayerPageUrl
  } finally {
    process.env.EXPO_PUBLIC_API_URL = before
  }
}

describe("youtubePlayerPageUrl", () => {
  it("is the player page of our own API", () => {
    expect(pageUrlWith("http://192.168.1.5:3000/api")).toBe(
      "http://192.168.1.5:3000/api/embed/youtube-player",
    )
  })

  it("ignores a trailing slash on the API address", () => {
    expect(pageUrlWith("https://api.example.com/api///")).toBe(
      "https://api.example.com/api/embed/youtube-player",
    )
  })

  it("is undefined while the API address is not configured", () => {
    expect(pageUrlWith(undefined)).toBeUndefined()
    expect(pageUrlWith("")).toBeUndefined()
  })
})
