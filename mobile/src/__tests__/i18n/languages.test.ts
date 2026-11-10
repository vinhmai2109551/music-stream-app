import { describe, expect, it, jest } from "@jest/globals"
import { getLocales, type Locale } from "expo-localization"
import {
  APP_LANGUAGES,
  FALLBACK_LANGUAGES,
  LANGUAGE_NAMES,
  deviceLanguage,
  isAppLanguage,
  languageFromTag,
} from "@/i18n"

const locale = (languageTag: string) => ({ languageTag }) as Locale

describe("languageFromTag", () => {
  it.each([
    ["vi", "vi"],
    ["vi-VN", "vi"],
    ["en-US", "en-US"],
    ["en-GB", "en-US"],
    ["EN_us", "en-US"],
    ["ko-KR", "ko"],
    ["ja-JP", "ja"],
    ["zh-Hans-CN", "zh-Hans"],
    ["zh-Hant-TW", "zh-Hans"],
  ])("%s -> %s", (tag, expected) => {
    expect(languageFromTag(tag)).toBe(expected)
  })

  it.each(["fr-FR", "de", "", "  "])("%j has no match", (tag) => {
    expect(languageFromTag(tag)).toBeNull()
  })

  it("has no match for nothing", () => {
    expect(languageFromTag(null)).toBeNull()
    expect(languageFromTag(undefined)).toBeNull()
  })
})

describe("isAppLanguage", () => {
  it("accepts the five languages and nothing else", () => {
    for (const language of APP_LANGUAGES) expect(isAppLanguage(language)).toBe(true)
    for (const other of ["en", "zh", "fr", "", null, undefined, 3]) {
      expect(isAppLanguage(other)).toBe(false)
    }
  })

  it("names every language in its own words", () => {
    expect(Object.keys(LANGUAGE_NAMES)).toEqual([...APP_LANGUAGES])
    expect(LANGUAGE_NAMES.ko).toBe("한국어")
  })
})

describe("deviceLanguage", () => {
  const mockedLocales = jest.mocked(getLocales)

  it("uses the first language of the phone that the app has", () => {
    mockedLocales.mockReturnValueOnce([locale("fr-FR"), locale("ko-KR"), locale("ja-JP")])
    expect(deviceLanguage()).toBe("ko")
  })

  it("falls back to Vietnamese when the phone speaks none of them", () => {
    mockedLocales.mockReturnValueOnce([locale("fr-FR"), locale("de-DE")])
    expect(deviceLanguage()).toBe("vi")
    expect(FALLBACK_LANGUAGES).toEqual(["vi", "en-US"])
  })
})
