import { describe, expect, it } from "@jest/globals"
import { decideNavigation } from "@/utils/turnstileNavigation"

const BASE = "https://localhost/"

// Addresses Turnstile really loads (measured in Chrome with the real site key): its own iframe,
// an about:blank frame at once and an about:srcdoc frame when the challenge runs.
const WIDGET_IFRAME =
  "https://challenges.cloudflare.com/cdn-cgi/challenge-platform/h/b/turnstile/f/av0/rch/81857/0x4AAAAAAA/dark/fbE/new/normal/auto/"

describe("decideNavigation", () => {
  it("lets the widget page load, whether it is the base address or a path of it", () => {
    expect(decideNavigation({ url: BASE, isTopFrame: true }, BASE)).toBe("allow")
    expect(decideNavigation({ url: `${BASE}index.html`, isTopFrame: true }, BASE)).toBe("allow")
  })

  it("lets Cloudflare load, the widget's iframe included", () => {
    expect(decideNavigation({ url: WIDGET_IFRAME, isTopFrame: false }, BASE)).toBe("allow")
    expect(decideNavigation({ url: WIDGET_IFRAME, isTopFrame: true }, BASE)).toBe("allow")
  })

  it("lets the frames Turnstile creates inside its iframe load: about:blank AND about:srcdoc", () => {
    // Refusing about:srcdoc is what made the widget spin for ever on iPhone.
    for (const url of ["about:blank", "about:srcdoc"]) {
      expect(decideNavigation({ url, isTopFrame: false }, BASE)).toBe("allow")
      expect(decideNavigation({ url, isTopFrame: true }, BASE)).toBe("allow")
    }
  })

  it("lets any frame below the page load, whatever its address (only the page is policed)", () => {
    for (const url of [
      "blob:https://challenges.cloudflare.com/1234",
      "data:text/html,x",
      "https://example.com/frame",
    ]) {
      expect(decideNavigation({ url, isTopFrame: false }, BASE)).toBe("allow")
    }
  })

  it("sends a link the person follows in the widget to the system browser", () => {
    expect(
      decideNavigation(
        { url: "https://www.cloudflare.com/privacypolicy/", isTopFrame: true },
        BASE,
      ),
    ).toBe("open-externally")
    expect(decideNavigation({ url: "http://example.com", isTopFrame: true }, BASE)).toBe(
      "open-externally",
    )
  })

  it("treats a request that does not say whether it is the page as the page", () => {
    expect(decideNavigation({ url: "https://example.com" }, BASE)).toBe("open-externally")
    expect(decideNavigation({ url: "about:srcdoc" }, BASE)).toBe("allow")
  })

  it("blocks the page from going anywhere that is not a web address (an app link, a script)", () => {
    for (const url of [
      "intent://scan/#Intent;end",
      "musicstreamapp://login",
      "javascript:alert(1)",
      "file:///etc/passwd",
    ]) {
      expect(decideNavigation({ url, isTopFrame: true }, BASE)).toBe("block")
    }
  })

  it("follows the configured base address", () => {
    expect(
      decideNavigation(
        { url: "https://musicstream.app/", isTopFrame: true },
        "https://musicstream.app/",
      ),
    ).toBe("allow")
    expect(decideNavigation({ url: "https://musicstream.app/", isTopFrame: true }, BASE)).toBe(
      "open-externally",
    )
  })
})
