import { describe, expect, it } from "@jest/globals"
import { APP_LANGUAGES, SOURCE_LANGUAGE, type AppLanguage } from "@/i18n"
import enUS from "@/i18n/locales/en-US.json"
import ja from "@/i18n/locales/ja.json"
import ko from "@/i18n/locales/ko.json"
import vi from "@/i18n/locales/vi.json"
import zhHans from "@/i18n/locales/zh-Hans.json"

type Tree = string | Tree[] | { [key: string]: Tree }

const FILES: Record<AppLanguage, Tree> = { vi, "en-US": enUS, ko, ja, "zh-Hans": zhHans }
const read = (language: AppLanguage): Tree => FILES[language]

function flatten(tree: Tree, prefix = ""): Record<string, string> {
  if (typeof tree === "string") return { [prefix]: tree }
  const entries: [string, Tree][] = Array.isArray(tree)
    ? tree.map((item, index): [string, Tree] => [String(index), item])
    : Object.entries(tree)
  return Object.assign(
    {},
    ...entries.map(([key, value]) => flatten(value, prefix ? `${prefix}.${key}` : key)),
  )
}

const placeholders = (text: string): string[] =>
  [...text.matchAll(/\{\{\s*([A-Za-z_][\w.]*)\s*\}\}/g)].map((match) => match[1]).sort()

/** "a.b_one" belongs to "a.b": the plural forms a language may add. */
const baseKey = (key: string): string => key.replace(/_(?:zero|one|two|few|many|other)$/, "")

const source = flatten(read(SOURCE_LANGUAGE))
const targets = APP_LANGUAGES.filter((language) => language !== SOURCE_LANGUAGE)

// The same checks as "npm run i18n:translate -- --check" makes on shape: no API, no network.
describe("the source (vi.json)", () => {
  it("has a text for every key and no empty one", () => {
    expect(Object.keys(source).length).toBeGreaterThan(300)
    for (const [key, text] of Object.entries(source)) {
      expect({ key, empty: text.trim() === "" }).toEqual({ key, empty: false })
    }
  })
})

describe.each(targets)("%s.json", (language) => {
  const texts = flatten(read(language))

  it("only has keys that vi.json has (or a plural form of one)", () => {
    const unknown = Object.keys(texts).filter(
      (key) => !(key in source) && !(baseKey(key) in source),
    )
    expect(unknown).toEqual([])
  })

  it("keeps the placeholders of the source text", () => {
    const broken = Object.entries(texts)
      .filter(([key, text]) => {
        const original = source[key] ?? source[baseKey(key)]
        return placeholders(text).join() !== placeholders(original).join()
      })
      .map(([key]) => key)
    expect(broken).toEqual([])
  })

  it("has no empty text and no leftover tag", () => {
    const bad = Object.entries(texts)
      .filter(([, text]) => text.trim() === "" || /<\/?(?:ph|keep)\b/.test(text))
      .map(([key]) => key)
    expect(bad).toEqual([])
  })

  it("is a whole translation or not started: a half-done file means the script was cut short", () => {
    const translated = Object.keys(texts).filter((key) => key in source).length
    expect([0, Object.keys(source).length]).toContain(translated)
  })
})
