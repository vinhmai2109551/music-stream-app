import { describe, expect, it } from "vitest"
import indexHtml from "../index.html?raw"
import nginxConf from "../nginx.conf?raw"

/** The Content-Security-Policy of the admin web, as nginx sends it. */
const csp = /set \$csp "([^"]+)";/.exec(nginxConf)?.[1] ?? ""
const directive = (name: string) =>
  csp
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name} `))

async function sha256Base64(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
}

describe("the Content-Security-Policy of the admin web (nginx.conf)", () => {
  it("is there, and is sent with the page", () => {
    expect(csp).not.toBe("")
    expect(nginxConf).toMatch(/location \/ \{[^}]*add_header Content-Security-Policy \$csp always;/)
  })

  it("allows the inline theme script of index.html by its hash, and no other inline script", async () => {
    const inline = [...indexHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)]
    expect(inline).toHaveLength(1)

    const scripts = directive("script-src") ?? ""
    expect(scripts).toContain(`'sha256-${await sha256Base64(inline[0][1])}'`)
    expect(scripts).not.toContain("'unsafe-inline'")
    expect(scripts).not.toContain("'unsafe-eval'")
    expect(scripts).toContain("'self'")
  })

  it("lets the page talk to the API (the address comes from the environment) and the upload storage only", () => {
    const connect = directive("connect-src") ?? ""
    expect(connect).toContain("'self'")
    expect(connect).toContain("${API_ORIGIN}")
    expect(connect).toContain("https://*.r2.cloudflarestorage.com")
    expect(connect).not.toMatch(/(^|\s)(https?:|\*)(\s|$)/)
  })

  it("forbids plugins, a changed base address and being framed", () => {
    expect(directive("object-src")).toBe("object-src 'none'")
    expect(directive("base-uri")).toBe("base-uri 'self'")
    expect(directive("frame-ancestors")).toBe("frame-ancestors 'none'")
    expect(directive("default-src")).toBe("default-src 'self'")
  })

  it("only names the outside hosts the page really uses", () => {
    const hosts = new Set(csp.match(/https:\/\/[A-Za-z0-9.*-]+/g))
    expect([...hosts].sort()).toEqual(
      [
        "https://*.r2.cloudflarestorage.com",
        "https://challenges.cloudflare.com",
        "https://fonts.googleapis.com",
        "https://fonts.gstatic.com",
        "https://www.youtube-nocookie.com",
        "https://www.youtube.com",
      ].sort(),
    )
  })
})
