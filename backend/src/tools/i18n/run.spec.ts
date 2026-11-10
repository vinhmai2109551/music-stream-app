import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals"
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { runI18n, type RunOptions } from "./run.js"

type Service = NonNullable<RunOptions["service"]>
type Translate = Service["translate"]

/** Stands in for DeepL: puts the language in front, and bills the characters it was sent. */
const prefixing = (): jest.Mock<Translate> =>
  jest.fn<Translate>(async (texts, target) => ({
    texts: texts.map((text) => `[${target}] ${text}`),
    billedCharacters: texts.reduce((sum, text) => sum + text.length, 0),
  }))

const ALL = ["vi", "en-US", "ko", "ja", "zh-Hans"] as const

const SOURCE = {
  app: { name: "Music Stream" },
  hello: "Xin chào",
  left: "Còn {{count}} tin",
  tags: ["Một", "Hai"],
}

describe("runI18n", () => {
  let dir: string
  let lines: string[]
  const log = (line: string) => lines.push(line)

  const write = (file: string, content: unknown) =>
    writeFile(path.join(dir, file), JSON.stringify(content, null, 2))
  const read = async (file: string) => JSON.parse(await readFile(path.join(dir, file), "utf8"))
  const run = (
    mode: RunOptions["mode"],
    service?: Service,
    languages: RunOptions["languages"] = ALL,
  ) => runI18n({ dir, mode, sourceLanguage: "vi", service, languages, log })

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "i18n-run-"))
    lines = []
    await mkdir(path.join(dir, "locales"), { recursive: true })
    await mkdir(path.join(dir, "translate", "overrides"), { recursive: true })
    await write("locales/vi.json", SOURCE)
    await write("translate/keep-list.json", ["Music Stream"])
    await write("translate/overrides/en-US.json", { left_one: "{{count}} message left" })
  })
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it("translates every language, keeps placeholders and the shape, and bills what it sent", async () => {
    const translate = prefixing()
    const result = await run("translate", { translate }, ["en-US", "ko"])

    expect(result.ok).toBe(true)
    // hello + left + the two list items; "Music Stream" is a brand name and stays at home.
    expect(translate).toHaveBeenCalledTimes(2)
    const english = await read("locales/en-US.json")
    expect(english).toEqual({
      app: { name: "Music Stream" },
      hello: "[en-US] Xin chào",
      left: "[en-US] Còn {{count}} tin",
      left_one: "{{count}} message left",
      tags: ["[en-US] Một", "[en-US] Hai"],
    })
    expect((await read("locales/ko.json")).left).toBe("[ko] Còn {{count}} tin")
    const lock = await read("translate/lock.json")
    expect(Object.keys(lock.languages)).toEqual(["en-US", "ko"])
    expect(result.billedCharacters).toBeGreaterThan(0)
  })

  it("does not call the service again when nothing changed", async () => {
    await run("translate", { translate: prefixing() }, ["ja"])
    const before = await readFile(path.join(dir, "locales/ja.json"), "utf8")

    const translate = prefixing()
    const second = await run("translate", { translate }, ["ja"])

    expect(translate).not.toHaveBeenCalled()
    expect(second.billedCharacters).toBe(0)
    expect(second.translated).toBe(0)
    expect(await readFile(path.join(dir, "locales/ja.json"), "utf8")).toBe(before)
  })

  it("translates only the text that changed or is new", async () => {
    await run("translate", { translate: prefixing() }, ["ko"])
    await write("locales/vi.json", { ...SOURCE, hello: "Tạm biệt", added: "Mới" })

    const translate = prefixing()
    await run("translate", { translate }, ["ko"])

    expect(translate).toHaveBeenCalledTimes(1)
    expect(translate.mock.calls[0][0]).toEqual(["Tạm biệt", "Mới"])
    expect((await read("locales/ko.json")).hello).toBe("[ko] Tạm biệt")
  })

  it("drops the texts that left the source", async () => {
    await run("translate", { translate: prefixing() }, ["ko"])
    await write("locales/vi.json", { hello: "Xin chào" })
    await run("translate", { translate: prefixing() }, ["ko"])
    expect(await read("locales/ko.json")).toEqual({ hello: "[ko] Xin chào" })
  })

  it("dry-run reports the size and calls nobody", async () => {
    const translate = prefixing()
    const result = await run("dry-run", { translate })
    expect(translate).not.toHaveBeenCalled()
    expect(result.ok).toBe(true)
    expect(result.pending).toBe(16)
    expect(lines.some((line) => line.startsWith("ko: 4 to translate (~"))).toBe(true)
  })

  it("check fails while something is missing or stale, and passes after translating", async () => {
    expect((await run("check")).ok).toBe(false)
    await run("translate", { translate: prefixing() })
    expect((await run("check")).ok).toBe(true)
    await write("locales/vi.json", { ...SOURCE, hello: "Chào bạn" })
    const stale = await run("check")
    expect(stale.ok).toBe(false)
    expect(lines.some((line) => line.includes("stale hello"))).toBe(true)
  })

  it("does not use a translation that lost a placeholder, and tries it again next time", async () => {
    const lossy: Translate = async (texts, target) => ({
      texts: texts.map((text) => `[${target}] ${text.replace(/<ph[^>]*>/g, "")}`),
      billedCharacters: 1,
    })
    const result = await run("translate", { translate: lossy }, ["ko"])

    expect(result.ok).toBe(false)
    expect((await read("locales/ko.json")).left).toBeUndefined()
    expect((await run("check", undefined, ["ko"])).pending).toBeGreaterThan(0)
  })

  it("stops on a service error but keeps the languages already done", async () => {
    const translate = jest.fn<Translate>(async (texts, target) => {
      if (target === "ja") throw new Error("quota used up")
      return { texts: texts.map((text) => `[${target}] ${text}`), billedCharacters: 1 }
    })
    const result = await run("translate", { translate }, ["en-US", "ja", "ko"])

    expect(result.ok).toBe(false)
    expect((await read("locales/en-US.json")).hello).toBe("[en-US] Xin chào")
    expect(translate).toHaveBeenCalledTimes(2)
    expect(lines.some((line) => line.includes("stopped - quota used up"))).toBe(true)
  })

  it("flags an override that matches no text", async () => {
    await write("translate/overrides/ko.json", { nope: "x" })
    const result = await run("check", undefined, ["ko"])
    expect(result.ok).toBe(false)
    expect(lines.some((line) => line.includes('override "nope"'))).toBe(true)
  })
})
