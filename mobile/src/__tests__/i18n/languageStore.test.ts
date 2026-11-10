import { beforeEach, describe, expect, it } from "@jest/globals"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { i18n, t } from "@/i18n"
import { useLanguageStore } from "@/store/languageStore"

const KEY = "music-stream-language"
const settle = () => new Promise<void>((resolve) => setImmediate(resolve))

// What the translation script would have written; the real files may still be empty.
function teach(language: string, resources: object) {
  i18n.addResourceBundle(language, "translation", resources, true, true)
}

beforeEach(async () => {
  await AsyncStorage.clear()
  useLanguageStore.setState({ choice: null, ready: false })
  await i18n.changeLanguage("vi")
})

describe("the language of the app", () => {
  it("follows the phone until a language is picked", () => {
    expect(useLanguageStore.getState().choice).toBeNull()
    expect(i18n.language).toBe("vi")
    expect(t("common.retry")).toBe("Thử lại")
  })

  it("changes every text at once and remembers the pick", async () => {
    teach("ko", { common: { retry: "다시 시도" } })

    useLanguageStore.getState().setChoice("ko")
    await settle()

    expect(i18n.language).toBe("ko")
    expect(t("common.retry")).toBe("다시 시도")
    expect(JSON.parse((await AsyncStorage.getItem(KEY)) ?? "{}").state).toEqual({ choice: "ko" })
  })

  it("goes back to the language of the phone when the pick is cleared", async () => {
    useLanguageStore.getState().setChoice("ja")
    await settle()
    expect(i18n.language).toBe("ja")

    useLanguageStore.getState().setChoice(null)
    await settle()

    expect(i18n.language).toBe("vi")
  })

  it("shows the Vietnamese text for one the language does not have yet", async () => {
    teach("zh-Hans", { common: { close: "关闭" } })

    useLanguageStore.getState().setChoice("zh-Hans")
    await settle()

    expect(t("common.close")).toBe("关闭")
    expect(t("common.retry")).toBe("Thử lại")
    expect(i18n.options.fallbackLng).toEqual(["vi", "en-US"])
  })

  it("puts numbers into texts and picks the plural form of the language", async () => {
    teach("en-US", {
      common: {
        count: { followers_one: "{{value}} follower", followers_other: "{{value}} followers" },
      },
    })

    expect(t("common.count.followers", { count: 1, value: "1" })).toBe("1 người theo dõi")

    useLanguageStore.getState().setChoice("en-US")
    await settle()

    expect(t("common.count.followers", { count: 1, value: "1" })).toBe("1 follower")
    expect(t("common.count.followers", { count: 2_100_000, value: "2.1M" })).toBe("2.1M followers")
  })

  it("fills {{name}} and keeps the rest of the text", () => {
    expect(t("playlist.addedTo", { name: "Chill" })).toBe("Đã thêm vào Chill")
    expect(t("auth.validation.emailTooLong", { max: 254 })).toBe("Email tối đa 254 ký tự")
  })
})

describe("the saved pick", () => {
  it("is applied when the app starts, and the app is ready", async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify({ state: { choice: "ja" }, version: 1 }))

    await useLanguageStore.persist.rehydrate()

    expect(useLanguageStore.getState()).toMatchObject({ choice: "ja", ready: true })
    expect(i18n.language).toBe("ja")
  })

  it("is dropped when it is not a language of the app", async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify({ state: { choice: "klingon" }, version: 1 }))

    await useLanguageStore.persist.rehydrate()

    expect(useLanguageStore.getState()).toMatchObject({ choice: null, ready: true })
    expect(i18n.language).toBe("vi")
  })

  it("is ready even when nothing was saved", async () => {
    await useLanguageStore.persist.rehydrate()

    expect(useLanguageStore.getState()).toMatchObject({ choice: null, ready: true })
  })
})
