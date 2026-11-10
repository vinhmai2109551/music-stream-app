import { describe, expect, it } from "@jest/globals"
import { fillTemplate, flatten, setPath, type Json } from "./flatten.js"
import { fingerprint } from "./placeholders.js"
import { OVERRIDE_MARK, expectedCharacters, planLanguage } from "./plan.js"

const KEEP = ["Music Stream"]
const source = { "a.title": "Xin chào", "a.count": "Còn {{count}} tin" }

const base = { source, existing: {}, lock: {}, overrides: {}, keepTerms: KEEP }

describe("planLanguage", () => {
  it("sends every new text", () => {
    const plan = planLanguage(base)
    expect(plan.toTranslate.map((item) => item.key)).toEqual(["a.title", "a.count"])
    expect(plan.toTranslate[1].protectedText).toBe('Còn <ph n="count"/> tin')
    expect(plan.toTranslate.every((item) => !item.stale)).toBe(true)
  })

  it("copies a text that has nothing to translate without sending it", () => {
    const plan = planLanguage({ ...base, source: { "a.brand": "K-Pop" }, keepTerms: ["K-Pop"] })
    expect(plan.texts["a.brand"]).toBe("K-Pop")
    expect(plan.toTranslate).toEqual([])
  })

  it("keeps a translation whose source did not change", () => {
    const plan = planLanguage({
      ...base,
      existing: { "a.title": "Hello", "a.count": "{{count}} left" },
      lock: {
        "a.title": fingerprint("Xin chào", KEEP),
        "a.count": fingerprint("Còn {{count}} tin", KEEP),
      },
    })
    expect(plan.toTranslate).toEqual([])
    expect(plan.texts["a.title"]).toBe("Hello")
  })

  it("sends a text again when its source changed", () => {
    const plan = planLanguage({
      ...base,
      source: { "a.title": "Tạm biệt" },
      existing: { "a.title": "Hello" },
      lock: { "a.title": fingerprint("Xin chào", KEEP) },
    })
    expect(plan.toTranslate).toHaveLength(1)
    expect(plan.toTranslate[0].stale).toBe(true)
  })

  it("sends a text again when the lock lost it", () => {
    const plan = planLanguage({
      ...base,
      source: { "a.title": "Xin chào" },
      existing: { "a.title": "Hello" },
    })
    expect(plan.toTranslate).toHaveLength(1)
  })

  it("never sends a text that has an override", () => {
    const plan = planLanguage({ ...base, overrides: { "a.title": "Hi there" } })
    expect(plan.texts["a.title"]).toBe("Hi there")
    expect(plan.lock["a.title"]).toBe(OVERRIDE_MARK)
    expect(plan.overridden).toEqual(["a.title"])
    expect(plan.toTranslate.map((item) => item.key)).not.toContain("a.title")
  })

  it("keeps plural forms that belong to a source text and flags the others", () => {
    const plan = planLanguage({
      ...base,
      overrides: { "a.count_one": "{{count}} message", "a.gone": "x" },
    })
    expect(plan.texts["a.count_one"]).toBe("{{count}} message")
    expect(plan.unknownOverrides).toEqual(["a.gone"])
  })
})

describe("expectedCharacters", () => {
  it("counts a repeated text once", () => {
    const item = { key: "k", source: "s", protectedText: "abcd", stale: false }
    expect(
      expectedCharacters([
        item,
        { ...item, key: "k2" },
        { ...item, key: "k3", protectedText: "xy" },
      ]),
    ).toBe(6)
  })
})

describe("flatten and fillTemplate", () => {
  const tree: Json = { a: { b: "1", list: ["x", "y"] }, c: "2" }

  it("lists every text with a dotted path, list items by index", () => {
    expect(flatten(tree)).toEqual({ "a.b": "1", "a.list.0": "x", "a.list.1": "y", c: "2" })
  })

  it("rebuilds the shape from the list", () => {
    expect(fillTemplate(tree, flatten(tree))).toEqual(tree)
  })

  it("leaves out a text that is missing, and a whole list when one item is", () => {
    expect(fillTemplate(tree, { "a.b": "1", "a.list.0": "x" })).toEqual({ a: { b: "1" } })
    expect(fillTemplate(tree, {})).toBeUndefined()
  })

  it("sets a text at a path, making the groups", () => {
    const target: Record<string, Json> = { a: { b: "1" } }
    setPath(target, "a.c_one", "2")
    setPath(target, "x.y.z", "3")
    expect(target).toEqual({ a: { b: "1", c_one: "2" }, x: { y: { z: "3" } } })
  })
})
