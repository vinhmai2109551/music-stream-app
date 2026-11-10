import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import { act, render, screen, userEvent } from "@testing-library/react-native"
import { AccountSheet } from "@/components/media/AccountSheet"
import { i18n, t } from "@/i18n"
import { useLanguageStore } from "@/store/languageStore"

jest.mock("expo-router", () => ({ router: { push: jest.fn() } }))

// What the translation script writes into ko.json; the real file may still be empty.
const KOREAN = {
  settings: {
    title: "계정",
    editProfile: "프로필 편집",
    language: { title: "언어", system: "기기 설정 따르기" },
  },
  common: { back: "뒤로" },
  auth: { logout: "로그아웃" },
}

const sheet = () =>
  render(
    <AccountSheet
      visible
      onClose={jest.fn()}
      name="Vinh"
      email="vinh@example.com"
      avatarUrl={null}
      onLogout={jest.fn()}
    />,
  )

beforeEach(async () => {
  i18n.addResourceBundle("ko", "translation", KOREAN, true, true)
  await act(async () => {
    useLanguageStore.setState({ choice: null })
    await i18n.changeLanguage("vi")
  })
})

describe("choosing the language in the account sheet", () => {
  it("lists the phone's own language and the five languages, in their own words", async () => {
    const user = userEvent.setup()
    await sheet()

    await user.press(screen.getByRole("button", { name: /^Ngôn ngữ/ }))

    const names = screen.getAllByRole("radio").map((radio) => radio.props.accessibilityLabel)
    expect(names).toEqual([
      `${t("settings.language.system")}. ${t("settings.language.systemHint")}`,
      "Tiếng Việt",
      "English",
      "한국어",
      "日本語",
      "简体中文",
    ])
    expect(screen.getByRole("radio", { name: /^Theo thiết bị/ })).toBeChecked()
  })

  it("changes the texts on the screen at once, with nothing to restart", async () => {
    const user = userEvent.setup()
    await sheet()
    expect(screen.getByText("Tài khoản")).toBeOnTheScreen()

    await user.press(screen.getByRole("button", { name: /^Ngôn ngữ/ }))
    await user.press(screen.getByRole("radio", { name: "한국어" }))

    expect(i18n.language).toBe("ko")
    expect(screen.getByRole("radio", { name: "한국어" })).toBeChecked()
    expect(screen.getByText("언어")).toBeOnTheScreen()

    await user.press(screen.getByRole("button", { name: "뒤로" }))

    expect(screen.getByText("계정")).toBeOnTheScreen()
    expect(screen.getByRole("button", { name: "프로필 편집" })).toBeOnTheScreen()
    expect(screen.getByRole("button", { name: "언어: 한국어" })).toBeOnTheScreen()
  })

  it("goes back to the phone's language with the first choice", async () => {
    const user = userEvent.setup()
    await sheet()
    await user.press(screen.getByRole("button", { name: /^Ngôn ngữ/ }))
    await user.press(screen.getByRole("radio", { name: "한국어" }))

    // The first row is "follow the phone".
    await user.press(screen.getAllByRole("radio")[0])

    expect(useLanguageStore.getState().choice).toBeNull()
    expect(i18n.language).toBe("vi")
  })
})
