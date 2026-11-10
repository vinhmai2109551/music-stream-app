import { afterAll, beforeAll, describe, expect, it } from "@jest/globals"
import { createHash } from "node:crypto"
import request from "supertest"
import { startTestServer, type TestServer } from "./helpers/test-server.js"

const PATH = "/api/embed/youtube-player"
const sha256 = (text: string) => `'sha256-${createHash("sha256").update(text).digest("base64")}'`

describe("YouTube player page (e2e)", () => {
  let server: TestServer
  let page: request.Response

  beforeAll(async () => {
    server = await startTestServer()
    page = await request(server.url).get(PATH)
  })

  afterAll(async () => {
    await server.stop()
  })

  it("is public and answers 200 with an HTML page", () => {
    expect(page.status).toBe(200)
    expect(page.headers["content-type"]).toBe("text/html; charset=utf-8")
    expect(page.text.startsWith("<!doctype html>")).toBe(true)
  })

  it("can be cached for an hour, as it never changes", () => {
    expect(page.headers["cache-control"]).toBe("public, max-age=3600")
  })

  it("does not let the browser guess the type, and still sends a referrer to YouTube", () => {
    expect(page.headers["x-content-type-options"]).toBe("nosniff")
    // YouTube answers error 153 to an embed without a referrer, so never "no-referrer".
    expect(page.headers["referrer-policy"]).toBe("strict-origin-when-cross-origin")
  })

  it("has a Content-Security-Policy that allows only youtube.com and ytimg.com", () => {
    const policy = page.headers["content-security-policy"] as string
    const directives = Object.fromEntries(
      policy.split(";").map((part) => {
        const [name, ...sources] = part.trim().split(/\s+/)
        return [name, sources]
      }),
    ) as Record<string, string[]>

    expect(directives["default-src"]).toEqual(["'none'"])
    expect(directives["script-src"].filter((source) => source.startsWith("https://"))).toEqual([
      "https://www.youtube.com",
      "https://s.ytimg.com",
    ])
    expect(directives["frame-src"]).toEqual(["https://www.youtube.com"])
    expect(directives["img-src"]).toEqual(["https://*.ytimg.com"])
    expect(directives["connect-src"]).toEqual(["https://www.youtube.com"])
    expect(directives["frame-ancestors"]).toEqual(["'none'"])
    expect(directives["base-uri"]).toEqual(["'none'"])
    expect(policy).not.toContain("unsafe-inline")
    expect(policy).not.toContain("unsafe-eval")
  })

  it("names its own script and style by hash, and the hashes match the page it sends", () => {
    const policy = page.headers["content-security-policy"] as string
    const script = /<script>([\s\S]*?)<\/script>/.exec(page.text)?.[1] ?? ""
    const style = /<style>([\s\S]*?)<\/style>/.exec(page.text)?.[1] ?? ""

    expect(script.length).toBeGreaterThan(0)
    expect(style.length).toBeGreaterThan(0)
    expect(policy).toContain(`script-src ${sha256(script)}`)
    expect(policy).toContain(`style-src ${sha256(style)}`)
    // Exactly one inline script and one inline style: nothing else would be allowed to run.
    expect(page.text.match(/<script/g)).toHaveLength(1)
    expect(page.text.match(/<style/g)).toHaveLength(1)
  })

  it("talks to the app the way react-native-youtube-iframe expects", () => {
    for (const expected of [
      "ReactNativeWebView.postMessage",
      "onYouTubeIframeAPIReady",
      "playerReady",
      "playerStateChange",
      "playerError",
      "playbackRateChange",
      "playerQualityChange",
      "fullScreenChange",
      "playVideo",
      "pauseVideo",
      "muteVideo",
      "unMuteVideo",
      "setVolume",
      "setPlaybackRate",
      "var player;", // the app runs scripts like player.getCurrentTime() in the page
    ]) {
      expect(page.text).toContain(expected)
    }
  })

  it("loads nothing from any host but YouTube", () => {
    const hosts = new Set(
      [...page.text.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)].map((match) => match[1]),
    )

    expect([...hosts].sort()).toEqual(["www.youtube.com"])
  })

  it("ignores the ?data= the app appends (the page reads it in the browser, the server never does)", async () => {
    const data = encodeURI(JSON.stringify({ videoId_s: "dQw4w9WgXcQ", start: 12, controls_s: 0 }))

    const response = await request(server.url).get(`${PATH}?data=${data}`)

    expect(response.status).toBe(200)
    expect(response.text).toBe(page.text)
    expect(response.text).not.toContain("dQw4w9WgXcQ")
  })

  it("sets no cookie and needs no login", () => {
    expect(page.headers["set-cookie"]).toBeUndefined()
    expect(page.status).not.toBe(401)
  })

  it("is listed in the API documentation", async () => {
    const docs = await request(server.url).get("/api/docs-json")

    expect(Object.keys((docs.body as { paths: Record<string, unknown> }).paths)).toContain(PATH)
  })
})
