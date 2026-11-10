import { describe, expect, it } from "@jest/globals"
import {
  fingerprint,
  hasNothingToTranslate,
  placeholdersOf,
  protect,
  restore,
  translationProblems,
} from "./placeholders.js"

const KEEP = ["Music Stream", "Premium", "Premium Duo", "K-Pop"]

describe("protect and restore", () => {
  it("wraps placeholders and brand names in tags", () => {
    expect(protect("Còn {{count}} tin nhắn trên Music Stream", KEEP)).toBe(
      'Còn <ph n="count"/> tin nhắn trên <keep>Music Stream</keep>',
    )
  })

  it("escapes characters XML would read as markup", () => {
    expect(protect("Tom & Jerry <3 {{name}}", KEEP)).toBe('Tom &amp; Jerry &lt;3 <ph n="name"/>')
  })

  it("keeps the longest brand name whole", () => {
    expect(protect("Gói Premium Duo và Premium", KEEP)).toBe(
      "Gói <keep>Premium Duo</keep> và <keep>Premium</keep>",
    )
  })

  it("does not touch a brand name inside a longer word", () => {
    expect(protect("Premiums và xPremium", KEEP)).toBe("Premiums và xPremium")
  })

  it("accepts spaces inside the braces", () => {
    expect(protect("Xin chào {{ name }}", [])).toBe('Xin chào <ph n="name"/>')
  })

  it("gives back the original text", () => {
    for (const text of [
      "Còn {{count}} tin nhắn hôm nay",
      "Tom & Jerry <3 {{name}}",
      "Nghe K-Pop trên Music Stream",
      "Không có gì đặc biệt",
    ]) {
      expect(restore(protect(text, KEEP))).toBe(text)
    }
  })

  it("reads the other ways DeepL may write an empty tag", () => {
    expect(restore('<ph n="a"></ph> and <ph n="b" /> and <ph n="c"/>')).toBe(
      "{{a}} and {{b}} and {{c}}",
    )
  })
})

describe("hasNothingToTranslate", () => {
  it("is true for brand names, placeholders and numbers only", () => {
    expect(hasNothingToTranslate(protect("K-Pop", KEEP))).toBe(true)
    expect(hasNothingToTranslate(protect("{{count}}", KEEP))).toBe(true)
    expect(hasNothingToTranslate(protect("Music Stream · {{value}} / 12", KEEP))).toBe(true)
  })

  it("is false when there are words", () => {
    expect(hasNothingToTranslate(protect("Còn {{count}} tin", KEEP))).toBe(false)
  })
})

describe("placeholdersOf", () => {
  it("lists the names sorted, repeats included", () => {
    expect(placeholdersOf("{{b}} {{a}} {{b}}")).toEqual(["a", "b", "b"])
    expect(placeholdersOf("no placeholders")).toEqual([])
  })
})

describe("translationProblems", () => {
  it("accepts a faithful translation", () => {
    expect(translationProblems("Còn {{count}} tin", "{{count}} left", KEEP)).toEqual([])
  })

  it("finds a lost, added or renamed placeholder", () => {
    expect(translationProblems("Còn {{count}} tin", "left", KEEP)).toHaveLength(1)
    expect(translationProblems("Còn tin", "{{count}} left", KEEP)).toHaveLength(1)
    expect(translationProblems("Còn {{count}} tin", "{{n}} left", KEEP)).toHaveLength(1)
  })

  it("finds a brand name that was changed", () => {
    expect(translationProblems("Nghe trên Music Stream", "음악 스트림", KEEP)).toEqual([
      '"Music Stream" was changed',
    ])
  })

  it("finds a tag that was left in and an empty answer", () => {
    expect(translationProblems("a", "<keep>a</keep>", [])).toHaveLength(1)
    expect(translationProblems("a", "  ", [])).toHaveLength(1)
  })
})

describe("fingerprint", () => {
  it("changes with the text and with the brand names in it", () => {
    const base = fingerprint("Nghe trên Music Stream", KEEP)
    expect(fingerprint("Nghe trên Music Stream", KEEP)).toBe(base)
    expect(fingerprint("Nghe ở Music Stream", KEEP)).not.toBe(base)
    expect(fingerprint("Nghe trên Music Stream", ["Music Stream", "Nghe"])).not.toBe(base)
  })

  it("ignores brand names that are not in the text", () => {
    expect(fingerprint("Xin chào", KEEP)).toBe(fingerprint("Xin chào", [...KEEP, "Cloudflare"]))
  })
})
