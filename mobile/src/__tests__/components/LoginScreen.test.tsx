import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import { render, screen, userEvent, waitFor } from "@testing-library/react-native"
import { router } from "expo-router"
import LoginScreen from "@/app/(auth)/login"
import { ApiError } from "@/api/client"
import { copy } from "@/constants/copy"
import { useAuthStore } from "@/store/authStore"

jest.mock("expo-router", () => ({ router: { replace: jest.fn() } }))

const text = copy.auth
const login = jest.fn<(input: { email: string; password: string }) => Promise<void>>()

const http = (status: number, message = "server message") =>
  new ApiError({ status, kind: "http", message })

/** Types into a field the way a person would, then presses the login button. */
async function fillAndSubmit(email: string, password: string) {
  const user = userEvent.setup()
  if (email) await user.type(screen.getByLabelText(text.fields.email.label), email)
  if (password) await user.type(screen.getByLabelText(text.fields.password.label), password)
  await user.press(screen.getByRole("button", { name: text.login.submit }))
  await settled()
}

/** Waits until the button is no longer busy, so every state update of the submit has landed. */
const settled = () =>
  waitFor(() => expect(screen.getByRole("button", { name: text.login.submit })).not.toBeBusy())

beforeEach(() => {
  jest.clearAllMocks()
  login.mockReset().mockResolvedValue(undefined)
  useAuthStore.setState({ login })
})

describe("LoginScreen validation", () => {
  it("asks for both fields and does not call the server when they are empty", async () => {
    await render(<LoginScreen />)

    await fillAndSubmit("", "")

    expect(screen.getByText(text.validation.emailRequired)).toBeOnTheScreen()
    expect(screen.getByText(text.validation.passwordRequired)).toBeOnTheScreen()
    expect(login).not.toHaveBeenCalled()
  })

  it("rejects an email that is not an email, and keeps the password error away", async () => {
    await render(<LoginScreen />)

    await fillAndSubmit("not-an-email", "secret123")

    expect(screen.getByText(text.validation.emailInvalid)).toBeOnTheScreen()
    expect(screen.queryByText(text.validation.passwordRequired)).not.toBeOnTheScreen()
    expect(login).not.toHaveBeenCalled()
  })

  it("an error disappears as soon as the field is edited", async () => {
    const user = userEvent.setup()
    await render(<LoginScreen />)
    await fillAndSubmit("", "")
    expect(screen.getByText(text.validation.emailRequired)).toBeOnTheScreen()

    await user.type(screen.getByLabelText(text.fields.email.label), "a")

    expect(screen.queryByText(text.validation.emailRequired)).not.toBeOnTheScreen()
    expect(screen.getByText(text.validation.passwordRequired)).toBeOnTheScreen()
  })
})

describe("LoginScreen submit", () => {
  it("sends the cleaned-up email and the password as typed", async () => {
    await render(<LoginScreen />)

    await fillAndSubmit("  Vinh@Example.COM ", " pass word ")

    expect(login).toHaveBeenCalledTimes(1)
    expect(login).toHaveBeenCalledWith({ email: "vinh@example.com", password: " pass word " })
  })

  it("sends no Turnstile token while Turnstile is not configured", async () => {
    await render(<LoginScreen />)

    await fillAndSubmit("a@b.co", "secret123")

    expect(login.mock.calls[0][0]).not.toHaveProperty("turnstileToken")
  })

  it("shows the server's verdict on wrong credentials", async () => {
    login.mockRejectedValue(http(401, "Invalid email or password"))
    await render(<LoginScreen />)

    await fillAndSubmit("a@b.co", "wrong-password")

    expect(await screen.findByText(text.errors.invalidCredentials)).toBeOnTheScreen()
  })

  it("tells the user when the security check failed or is unavailable", async () => {
    login.mockRejectedValueOnce(http(400, "Security check failed"))
    await render(<LoginScreen />)
    await fillAndSubmit("a@b.co", "secret123")
    expect(await screen.findByText(text.errors.turnstileFailed)).toBeOnTheScreen()

    login.mockRejectedValueOnce(http(503, "unavailable"))
    await userEventPressLogin()
    expect(await screen.findByText(text.errors.turnstileUnavailable)).toBeOnTheScreen()
  })

  it("shows a message for rate limiting and for connection problems", async () => {
    login.mockRejectedValueOnce(http(429, "ThrottlerException"))
    await render(<LoginScreen />)
    await fillAndSubmit("a@b.co", "secret123")
    expect(await screen.findByText(copy.errors.tooManyRequests)).toBeOnTheScreen()

    login.mockRejectedValueOnce(
      new ApiError({ status: 0, kind: "network", message: copy.errors.network }),
    )
    await userEventPressLogin()
    expect(await screen.findByText(copy.errors.network)).toBeOnTheScreen()
  })

  it("ignores a second press while the first request is still running", async () => {
    let finish: () => void = () => {}
    login.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve
        }),
    )
    const user = userEvent.setup()
    await render(<LoginScreen />)
    await user.type(screen.getByLabelText(text.fields.email.label), "a@b.co")
    await user.type(screen.getByLabelText(text.fields.password.label), "secret123")

    await user.press(screen.getByRole("button", { name: text.login.submit }))
    await user.press(screen.getByRole("button", { name: text.login.submit }))

    expect(login).toHaveBeenCalledTimes(1)
    finish()
    await settled()
  })

  it("the link at the bottom opens the register screen", async () => {
    const user = userEvent.setup()
    await render(<LoginScreen />)

    await user.press(screen.getByRole("link", { name: text.login.switchAction }))

    expect(router.replace).toHaveBeenCalledWith("/register")
  })
})

async function userEventPressLogin() {
  const user = userEvent.setup()
  await user.press(screen.getByRole("button", { name: text.login.submit }))
  await settled()
}
