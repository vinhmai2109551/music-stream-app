import { describe, expect, it } from "@jest/globals"
import {
  APP_LANGUAGES,
  deeplSourceCode,
  deeplTargetCode,
  parseAppLanguage,
  SOURCE_LANGUAGE,
} from "./translation-languages.js"

describe("the languages of the app", () => {
  it("are Vietnamese, American English, Korean, Japanese and Simplified Chinese", () => {
    expect([...APP_LANGUAGES]).toEqual(["vi", "en-US", "ko", "ja", "zh-Hans"])
    expect(SOURCE_LANGUAGE).toBe("vi")
  })

  it.each([
    ["vi", "VI"],
    ["en-US", "EN-US"],
    ["ko", "KO"],
    ["ja", "JA"],
    ["zh-Hans", "ZH-HANS"],
  ] as const)("%s is %s for DeepL as a target", (language, code) => {
    expect(deeplTargetCode(language)).toBe(code)
  })

  it("has no regional variant in the codes of a source language", () => {
    expect(deeplSourceCode("en-US")).toBe("EN")
    expect(deeplSourceCode("zh-Hans")).toBe("ZH")
    expect(deeplSourceCode("vi")).toBe("VI")
  })
})

describe("parseAppLanguage", () => {
  it.each(["vi", "en-US", "ko", "ja", "zh-Hans"])("accepts %s", (code) => {
    expect(parseAppLanguage(code)).toBe(code)
  })

  it("accepts any case and spaces around, and gives the code the app uses", () => {
    expect(parseAppLanguage("EN-us")).toBe("en-US")
    expect(parseAppLanguage("  ZH-HANS ")).toBe("zh-Hans")
    expect(parseAppLanguage("KO")).toBe("ko")
  })

  it.each([
    "en", // DeepL would take it, but the app has one English: en-US
    "en-GB",
    "zh",
    "zh-Hant",
    "pt",
    "de",
    "",
    " ",
    "vi-VN",
    "ko ja",
    "../etc",
  ])("refuses %p", (code) => {
    expect(parseAppLanguage(code)).toBeNull()
  })

  it.each([null, undefined, 5, {}, ["vi"]])("refuses a value that is not a string: %p", (value) => {
    expect(parseAppLanguage(value)).toBeNull()
  })
})
