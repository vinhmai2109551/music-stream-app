import { t } from "@/i18n"
import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import { render, screen, userEvent, waitFor } from "@testing-library/react-native"
import LoginScreen from "@/app/(auth)/login"
import { ApiError } from "@/api/client"
import { useAuthStore } from "@/store/authStore"

jest.mock("expo-router", () => ({ router: { replace: jest.fn() } }))
jest.mock("@/constants/turnstile", () => ({ TURNSTILE: { enabled: true, siteKey: "site-key" } }))
// The real widget needs a WebView and Cloudflare; this one hands out a token when "solved".
jest.mock("@/components/ui/TurnstileWidget", () => {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { Pressable } = require("react-native") as typeof import("react-native")
  const React = require("react") as typeof import("react")
  /* eslint-enable @typescript-eslint/no-require-imports */
  let solved = 0
  return {
    TurnstileWidget: ({ onToken }: { onToken: (token: string | null) => void }) =>
      React.createElement(Pressable, {
        accessibilityRole: "button",
        accessibilityLabel: "Solve the check",
        onPress: () => onToken(`token-${++solved}`),
      }),
  }
})

const login = jest.fn<(input: { turnstileToken?: string }) => Promise<void>>()

const waitUntilIdle = () =>
  waitFor(() => expect(screen.getByRole("button", { name: t("auth.login.submit") })).not.toBeBusy())

async function typeCredentials() {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText(t("auth.fields.email.label")), "a@b.co")
  await user.type(screen.getByLabelText(t("auth.fields.password.label")), "secret123")
  return user
}

beforeEach(() => {
  jest.clearAllMocks()
  login.mockReset().mockResolvedValue(undefined)
  useAuthStore.setState({ login: login as never })
})

describe("LoginScreen with Cloudflare Turnstile switched on", () => {
  it("asks for the security check before it will log in", async () => {
    await render(<LoginScreen />)
    const user = await typeCredentials()

    await user.press(screen.getByRole("button", { name: t("auth.login.submit") }))

    expect(screen.getByText(t("auth.turnstile.required"))).toBeOnTheScreen()
    expect(login).not.toHaveBeenCalled()
  })

  it("sends the token once the check is solved, and the warning goes away", async () => {
    await render(<LoginScreen />)
    const user = await typeCredentials()
    await user.press(screen.getByRole("button", { name: t("auth.login.submit") }))
    expect(screen.getByText(t("auth.turnstile.required"))).toBeOnTheScreen()

    await user.press(screen.getByRole("button", { name: "Solve the check" }))
    expect(screen.queryByText(t("auth.turnstile.required"))).not.toBeOnTheScreen()
    await user.press(screen.getByRole("button", { name: t("auth.login.submit") }))
    await waitUntilIdle()

    expect(login).toHaveBeenCalledTimes(1)
    expect(login.mock.calls[0][0]).toMatchObject({ turnstileToken: "token-1" })
  })

  it("a token works once: after an attempt the check has to be solved again", async () => {
    login.mockRejectedValueOnce(new ApiError({ status: 401, kind: "http", message: "wrong" }))
    await render(<LoginScreen />)
    const user = await typeCredentials()
    await user.press(screen.getByRole("button", { name: "Solve the check" }))
    await user.press(screen.getByRole("button", { name: t("auth.login.submit") }))
    await waitUntilIdle()
    expect(await screen.findByText(t("auth.errors.invalidCredentials"))).toBeOnTheScreen()

    await user.press(screen.getByRole("button", { name: t("auth.login.submit") }))

    expect(screen.getByText(t("auth.turnstile.required"))).toBeOnTheScreen()
    expect(login).toHaveBeenCalledTimes(1)
  })
})
