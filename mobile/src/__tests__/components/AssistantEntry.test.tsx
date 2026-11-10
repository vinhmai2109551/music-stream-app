import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import { render, screen, userEvent, waitFor } from "@testing-library/react-native"
import { router } from "expo-router"
import type { ComponentProps } from "react"
import { AccountSheet } from "@/components/media/AccountSheet"
import { TabBar } from "@/components/ui/TabBar"
import { t } from "@/i18n"
import { useAssistantStore } from "@/store/assistantStore"

jest.mock("expo-router", () => ({ router: { push: jest.fn() } }))

const mockRouter = jest.mocked(router)

type TabBarProps = ComponentProps<typeof TabBar>

function tabBarProps(): TabBarProps {
  const routes = ["index", "search", "feed", "library"].map((name) => ({
    key: `${name}-key`,
    name,
  }))
  return {
    state: { index: 0, routes },
    emitter: { emit: jest.fn(() => ({ defaultPrevented: false })) },
    navigateToTab: jest.fn(),
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
  } as unknown as TabBarProps
}

beforeEach(() => {
  jest.clearAllMocks()
  useAssistantStore.getState().reset()
})

describe("the button in the middle of the tab bar", () => {
  it("sits between Search and Feed", async () => {
    await render(<TabBar {...tabBarProps()} />)

    const labels = screen
      .getAllByLabelText(
        new RegExp(
          `^(${[t("nav.home"), t("nav.search"), t("nav.feed"), t("nav.library"), t("assistant.open")].join("|")})$`,
        ),
      )
      .map((element) => element.props.accessibilityLabel)
    expect(labels).toEqual([
      t("nav.home"),
      t("nav.search"),
      t("assistant.open"),
      t("nav.feed"),
      t("nav.library"),
    ])
  })

  it("is there before the server has been asked, and when it says the assistant is on", async () => {
    await render(<TabBar {...tabBarProps()} />)
    expect(screen.getByRole("button", { name: t("assistant.open") })).toBeOnTheScreen()

    useAssistantStore.setState({ availability: "available" })
    await render(<TabBar {...tabBarProps()} />)
    expect(screen.getAllByRole("button", { name: t("assistant.open") }).length).toBeGreaterThan(0)
  })

  it("goes away when the server says the assistant is off, and the four tabs stay", async () => {
    useAssistantStore.setState({ availability: "unavailable" })
    await render(<TabBar {...tabBarProps()} />)

    expect(screen.queryByRole("button", { name: t("assistant.open") })).not.toBeOnTheScreen()
    expect(screen.getAllByRole("tab")).toHaveLength(4)
  })

  it("opens the assistant", async () => {
    const user = userEvent.setup()
    await render(<TabBar {...tabBarProps()} />)

    await user.press(screen.getByRole("button", { name: t("assistant.open") }))

    expect(mockRouter.push).toHaveBeenCalledWith("/assistant")
  })

  it("is not one of the tabs: pressing it does not change the tab", async () => {
    const props = tabBarProps()
    const user = userEvent.setup()
    await render(<TabBar {...props} />)

    await user.press(screen.getByRole("button", { name: t("assistant.open") }))

    expect(props.navigateToTab).not.toHaveBeenCalled()
  })
})

describe("the entry in the account sheet", () => {
  const sheet = (onClose = jest.fn()) =>
    render(
      <AccountSheet
        visible
        onClose={onClose}
        name="Vinh"
        email="vinh@example.com"
        avatarUrl={null}
        onLogout={jest.fn()}
      />,
    )

  it("opens the assistant and closes the sheet", async () => {
    const onClose = jest.fn()
    const user = userEvent.setup()
    await sheet(onClose)

    await user.press(screen.getByRole("button", { name: t("assistant.open") }))

    expect(onClose).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith("/assistant"))
  })

  it("is not offered when the assistant is off", async () => {
    useAssistantStore.setState({ availability: "unavailable" })
    await sheet()

    expect(screen.queryByRole("button", { name: t("assistant.open") })).not.toBeOnTheScreen()
    expect(screen.getByRole("button", { name: t("settings.editProfile") })).toBeOnTheScreen()
  })
})
