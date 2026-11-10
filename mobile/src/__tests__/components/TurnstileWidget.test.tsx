import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import { act, fireEvent, render, screen } from "@testing-library/react-native"
import { Linking } from "react-native"
import { TurnstileWidget } from "@/components/ui/TurnstileWidget"
import { sizes } from "@/theme"
import { t } from "@/i18n"

const STALL_MS = 25_000

jest.mock("@/constants/turnstile", () => ({
  TURNSTILE: {
    enabled: true,
    siteKey: "site-key-123",
    baseUrl: "https://localhost/",
    scriptUrl: "https://challenges.cloudflare.com/turnstile/v0/api.js",
    height: 70,
    stallMs: 25000,
  },
}))

// A WebView that records what it was given and how often it was (re)mounted.
type SeenProps = {
  source: { html: string; baseUrl: string }
  onMessage: (event: { nativeEvent: { data: string } }) => void
  onShouldStartLoadWithRequest: (request: { url: string; isTopFrame?: boolean }) => boolean
  onError: () => void
  originWhitelist: string[]
}
const mockWebView: { props: SeenProps | null; mounts: number } = { props: null, mounts: 0 }
jest.mock("react-native-webview", () => {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const React = require("react") as typeof import("react")
  /* eslint-enable @typescript-eslint/no-require-imports */
  return {
    WebView: (props: SeenProps) => {
      mockWebView.props = props
      React.useEffect(() => {
        mockWebView.mounts += 1
      }, [])
      return React.createElement("WebView")
    },
  }
})

const onToken = jest.fn<(token: string | null) => void>()
const failedText = () => screen.queryByText(t("auth.turnstile.failed"))
const codeText = (code: string) => `${t("auth.turnstile.errorCode")}: ${code}`

/** What the page inside the WebView would post. */
async function post(message: object) {
  await act(async () => {
    mockWebView.props?.onMessage({ nativeEvent: { data: JSON.stringify(message) } })
  })
}
const wait = (ms: number) =>
  act(async () => {
    jest.advanceTimersByTime(ms)
  })

beforeEach(async () => {
  jest.useFakeTimers()
  jest.clearAllMocks()
  mockWebView.props = null
  mockWebView.mounts = 0
  jest.spyOn(Linking, "openURL").mockResolvedValue(undefined as never)
  await render(<TurnstileWidget action="login" onToken={onToken} />)
})

describe("TurnstileWidget (native)", () => {
  it("loads a page with the site key and the action, as the configured hostname", () => {
    const { html, baseUrl } = mockWebView.props!.source

    expect(baseUrl).toBe("https://localhost/")
    expect(html).toContain("site-key-123")
    expect(html).toContain('"action":"login"')
    expect(html).toContain("https://challenges.cloudflare.com/turnstile/v0/api.js")
    expect(mockWebView.props!.originWhitelist).toEqual(["*"])
  })

  it("tells the app when the check needs a tap, and when that is over", () => {
    const { html } = mockWebView.props!.source

    expect(html).toContain("before-interactive-callback")
    expect(html).toContain('type: "interactive"')
    expect(html).toContain('type: "interactive-done"')
  })

  describe("the navigation filter given to the WebView", () => {
    const allows = (url: string, isTopFrame?: boolean) =>
      mockWebView.props!.onShouldStartLoadWithRequest({ url, isTopFrame })

    it("lets Cloudflare's frames through, about:srcdoc included (the iPhone bug)", () => {
      expect(allows("about:srcdoc", false)).toBe(true)
      expect(allows("about:blank", false)).toBe(true)
      expect(allows("https://challenges.cloudflare.com/cdn-cgi/challenge-platform/x", false)).toBe(
        true,
      )
      expect(allows("blob:https://challenges.cloudflare.com/abc", false)).toBe(true)
      expect(Linking.openURL).not.toHaveBeenCalled()
    })

    it("opens a link of the widget in the browser and keeps the widget where it is", () => {
      expect(allows("https://www.cloudflare.com/privacypolicy/", true)).toBe(false)
      expect(Linking.openURL).toHaveBeenCalledWith("https://www.cloudflare.com/privacypolicy/")
    })

    it("blocks the page from leaving for something that is not a web address", () => {
      expect(allows("musicstreamapp://login", true)).toBe(false)
      expect(Linking.openURL).not.toHaveBeenCalled()
    })
  })

  describe("the result", () => {
    it("hands the token to the screen and never offers a retry afterwards", async () => {
      await post({ type: "token", token: "token-1" })
      await wait(STALL_MS * 4)

      expect(onToken).toHaveBeenCalledWith("token-1")
      expect(failedText()).toBeNull()
    })

    it("takes the token back when it expires, and waits for the next one", async () => {
      await post({ type: "token", token: "token-1" })
      await post({ type: "expired" })

      expect(onToken).toHaveBeenLastCalledWith(null)
      await wait(STALL_MS)
      expect(failedText()).not.toBeNull() // the new check did not finish either
    })

    it("an error shows the retry at once, with Cloudflare's code, and withdraws the token", async () => {
      await post({ type: "error", code: "600010" })

      expect(onToken).toHaveBeenLastCalledWith(null)
      expect(failedText()).not.toBeNull()
      expect(screen.getByText(codeText("600010"))).toBeOnTheScreen()
    })

    it("an error that carries no code is reported as unknown", async () => {
      await post({ type: "error" })

      expect(screen.getByText(codeText("unknown"))).toBeOnTheScreen()
    })

    it("the page saying its script never loaded is reported as such", async () => {
      await post({ type: "error", code: "script" })

      expect(screen.getByText(codeText("script"))).toBeOnTheScreen()
    })

    it("a token that arrives after the retry was offered takes it away again", async () => {
      await wait(STALL_MS)
      expect(failedText()).not.toBeNull()

      await post({ type: "token", token: "late-token" })

      expect(onToken).toHaveBeenLastCalledWith("late-token")
      expect(failedText()).toBeNull()
    })

    it("a WebView that fails to load shows the retry", async () => {
      await act(async () => {
        mockWebView.props?.onError()
      })

      expect(failedText()).not.toBeNull()
      expect(screen.getByText(codeText("webview"))).toBeOnTheScreen()
    })
  })

  describe("never spinning for ever", () => {
    it("offers a retry when nothing has come of the check after the stall time", async () => {
      await wait(STALL_MS - 1)
      expect(failedText()).toBeNull()

      await wait(1)

      expect(failedText()).not.toBeNull()
      expect(screen.getByText(codeText("timeout"))).toBeOnTheScreen()
    })

    it("does not rush a person who is about to tap the check", async () => {
      await post({ type: "interactive" })
      await wait(STALL_MS * 4)

      expect(failedText()).toBeNull()
    })

    it("starts counting again once the tap is done", async () => {
      await post({ type: "interactive" })
      await wait(STALL_MS * 2)
      await post({ type: "interactive-done" })
      await wait(STALL_MS - 1)
      expect(failedText()).toBeNull()

      await wait(1)

      expect(failedText()).not.toBeNull()
    })

    it("makes the retry big enough to tap", async () => {
      await wait(STALL_MS)

      expect(screen.getByRole("button")).toHaveStyle({ minHeight: sizes.minTouch })
    })

    it("pressing the retry loads the page again, withdraws any token and gives it a fresh clock", async () => {
      await wait(STALL_MS)
      expect(mockWebView.mounts).toBe(1)

      await fireEvent.press(screen.getByRole("button"))

      expect(mockWebView.mounts).toBe(2) // a new WebView: a new challenge
      expect(onToken).toHaveBeenLastCalledWith(null)
      expect(failedText()).toBeNull()
      expect(screen.queryByText(codeText("timeout"))).toBeNull()
      await wait(STALL_MS)
      expect(failedText()).not.toBeNull()
    })
  })
})
