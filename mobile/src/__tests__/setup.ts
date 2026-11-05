import { afterEach, jest } from "@jest/globals"

// The API client reads its address when it loads, so it has to be set before anything imports it.
process.env.EXPO_PUBLIC_API_URL = "http://api.test/api"
process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY = ""

// Components that read the safe area need a provider; the library ships a ready-made mock.
jest.mock(
  "react-native-safe-area-context",
  () =>
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("react-native-safe-area-context/jest/mock").default,
)

// The WebView is a native module that does not exist in Jest; a plain host element stands in.
jest.mock("react-native-webview", () => ({ WebView: "WebView" }))

afterEach(() => {
  jest.useRealTimers()
})
