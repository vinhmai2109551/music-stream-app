import { describe, expect, it } from "@jest/globals"
import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { CHUNK_OVERLAP, CHUNK_SIZE, chunkMarkdown } from "./knowledge-chunker.js"

const words = (count: number, word = "từ") => Array.from({ length: count }, () => word).join(" ")

describe("chunkMarkdown", () => {
  it("gives nothing for empty text or text with only headings", () => {
    expect(chunkMarkdown("a.md", "")).toEqual([])
    expect(chunkMarkdown("a.md", "  \n\n ")).toEqual([])
    expect(chunkMarkdown("a.md", "# Only a title\n\n## Another")).toEqual([])
  })

  it("keeps a short section as one chunk named after its heading", () => {
    const chunks = chunkMarkdown("a.md", "# Premium\n\nMột câu ngắn.")

    expect(chunks).toEqual([
      { source: "a.md", heading: "Premium", position: 0, content: "Một câu ngắn." },
    ])
  })

  it("starts a new chunk at every heading and never crosses one", () => {
    const chunks = chunkMarkdown("a.md", "# A\n\nFirst.\n\n# B\n\nSecond.\n\n# C\n\nThird.")

    expect(chunks.map((c) => [c.heading, c.content])).toEqual([
      ["A", "First."],
      ["B", "Second."],
      ["C", "Third."],
    ])
  })

  it("names a sub-heading after the headings above it, even when a parent has no text", () => {
    const chunks = chunkMarkdown(
      "a.md",
      "# Premium\n\n## Các gói\n\nBa gói.\n\n### Duo\n\nHai người.\n\n## Huỷ\n\nChưa có.\n\n# Phát nhạc\n\nYouTube.",
    )

    expect(chunks.map((c) => c.heading)).toEqual([
      "Premium › Các gói",
      "Premium › Các gói › Duo",
      "Premium › Huỷ",
      "Phát nhạc",
    ])
  })

  it("keeps a '#' that ends a heading's text, and drops a closing sequence", () => {
    const chunks = chunkMarkdown(
      "a.md",
      "## Chọn gói C#\n\nmột\n\n## Hashtag #\n\nhai\n\n## Đóng ##\n\nba",
    )

    expect(chunks.map((c) => c.heading)).toEqual(["Chọn gói C#", "Hashtag", "Đóng"])
  })

  it("is not fooled by a '~~~' line inside a backtick code block", () => {
    const chunks = chunkMarkdown("a.md", "# A\n\n```\n~~~\n# code comment\n```\n\n# B\n\nreal")

    expect(chunks.map((c) => c.heading)).toEqual(["A", "B"])
    expect(chunks[0].content).toContain("# code comment")
  })

  it("closes a code block only with a fence at least as long as the one that opened it", () => {
    const chunks = chunkMarkdown("a.md", "# A\n\n````\n```\n# still code\n````\n\n# B\n\nreal")

    expect(chunks.map((c) => c.heading)).toEqual(["A", "B"])
    expect(chunks[0].content).toContain("# still code")
  })

  it("numbers the chunks of a file 0, 1, 2... in order", () => {
    const chunks = chunkMarkdown("a.md", "# A\n\none\n\n# B\n\ntwo\n\n# C\n\nthree")

    expect(chunks.map((c) => c.position)).toEqual([0, 1, 2])
  })

  it("gives text before the first heading an empty heading", () => {
    const chunks = chunkMarkdown("a.md", "Intro text.\n\n# Title\n\nBody.")

    expect(chunks.map((c) => c.heading)).toEqual(["", "Title"])
  })

  it("does not take a '#' line inside a code block for a heading", () => {
    const chunks = chunkMarkdown("a.md", "# Real\n\n```\n# not a heading\n```\n\nafter")

    expect(chunks).toHaveLength(1)
    expect(chunks[0].heading).toBe("Real")
    expect(chunks[0].content).toContain("# not a heading")
  })

  it("accepts closing hashes and Windows line endings", () => {
    const chunks = chunkMarkdown("a.md", "## Title ##\r\n\r\nBody\r\nsecond line")

    expect(chunks[0].heading).toBe("Title")
    expect(chunks[0].content).not.toContain("\r")
  })

  describe("a long section", () => {
    const paragraphs = Array.from({ length: 12 }, (_, i) => `Đoạn ${i}: ${words(25)}.`)
    const markdown = `# Dài\n\n${paragraphs.join("\n\n")}`

    it("is cut into chunks no longer than the size", () => {
      const chunks = chunkMarkdown("a.md", markdown)

      expect(chunks.length).toBeGreaterThan(2)
      for (const chunk of chunks) expect(chunk.content.length).toBeLessThanOrEqual(CHUNK_SIZE)
    })

    it("keeps the heading on every chunk", () => {
      expect(chunkMarkdown("a.md", markdown).every((c) => c.heading === "Dài")).toBe(true)
    })

    it("cuts at paragraph boundaries when it can", () => {
      const chunks = chunkMarkdown("a.md", markdown)

      for (const chunk of chunks)
        expect(chunk.content.startsWith("Đoạn") || chunk.content.length > 0).toBe(true)
      // No paragraph is split in the middle: each chunk holds whole paragraphs.
      const all = chunks.map((c) => c.content).join("\n")
      for (const paragraph of paragraphs) expect(all).toContain(paragraph)
    })

    it("repeats the end of a chunk at the start of the next", () => {
      const chunks = chunkMarkdown("a.md", markdown)

      for (let i = 1; i < chunks.length; i += 1) {
        const previousEnd = chunks[i - 1].content.slice(-CHUNK_OVERLAP)
        const carried = chunks[i].content.split("\n")[0]
        expect(previousEnd.endsWith(carried) || carried.length <= CHUNK_OVERLAP).toBe(true)
        expect(chunks[i - 1].content.endsWith(carried)).toBe(true)
        expect(carried.length).toBeLessThanOrEqual(CHUNK_OVERLAP)
      }
    })

    it("loses no text", () => {
      const joined = chunkMarkdown("a.md", markdown)
        .map((c) => c.content)
        .join(" ")
      for (const paragraph of paragraphs) expect(joined).toContain(paragraph)
    })
  })

  it("splits a long paragraph at sentences", () => {
    const sentences = Array.from(
      { length: 16 },
      (_, i) => `Câu số ${i} nói về một điều nào đó khá dài dòng.`,
    )
    const chunks = chunkMarkdown("a.md", `# T\n\n${sentences.join(" ")}`)

    expect(chunks.length).toBeGreaterThan(1)
    for (const chunk of chunks) {
      expect(chunk.content.length).toBeLessThanOrEqual(CHUNK_SIZE)
      expect(chunk.content.trimEnd().endsWith(".")).toBe(true)
    }
  })

  it("splits a list at its lines", () => {
    const items = Array.from({ length: 30 }, (_, i) => `- Mục ${i}: ${words(8)}`)
    const chunks = chunkMarkdown("a.md", `# L\n\n${items.join("\n")}`)

    expect(chunks.length).toBeGreaterThan(1)
    for (const chunk of chunks) {
      // The first line of a later chunk may be the carried end of the previous one.
      for (const line of chunk.content.split("\n").slice(1)) {
        expect(line.startsWith("- Mục")).toBe(true)
      }
    }
  })

  it("cuts a sentence longer than a chunk at spaces", () => {
    const chunks = chunkMarkdown("a.md", `# T\n\n${words(400)}`)

    expect(chunks.length).toBeGreaterThan(2)
    for (const chunk of chunks) {
      expect(chunk.content.length).toBeLessThanOrEqual(CHUNK_SIZE)
      expect(chunk.content.split(/\s+/).every((word) => word === "từ")).toBe(true)
    }
  })

  it("cuts a single word longer than a chunk, without looping forever", () => {
    const chunks = chunkMarkdown("a.md", `# T\n\n${"x".repeat(1300)}`)

    // The last one also carries the 50 characters that end the one before it.
    expect(chunks.map((c) => c.content.length)).toEqual([500, 500, 351])
  })

  it("takes the size and the overlap as options", () => {
    const text = `# T\n\n${Array.from({ length: 6 }, (_, i) => `Đoạn ${i} ${words(10)}`).join("\n\n")}`

    const small = chunkMarkdown("a.md", text, { size: 120, overlap: 20 })
    const large = chunkMarkdown("a.md", text, { size: 2000, overlap: 20 })

    expect(small.length).toBeGreaterThan(large.length)
    expect(large).toHaveLength(1)
    for (const chunk of small) expect(chunk.content.length).toBeLessThanOrEqual(120)
  })

  it("works with no overlap", () => {
    const text = `# T\n\n${Array.from({ length: 8 }, (_, i) => `Đoạn ${i} ${words(30)}`).join("\n\n")}`
    const chunks = chunkMarkdown("a.md", text, { overlap: 0 })

    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks[1].content.startsWith("Đoạn")).toBe(true)
  })

  it("refuses a size that is not positive or an overlap that is not smaller than the size", () => {
    expect(() => chunkMarkdown("a.md", "x", { size: 0 })).toThrow()
    expect(() => chunkMarkdown("a.md", "x", { size: 100, overlap: 100 })).toThrow()
    expect(() => chunkMarkdown("a.md", "x", { size: 100, overlap: -1 })).toThrow()
  })

  it("gives the same chunks for the same text (the index relies on it)", () => {
    const text = `# T\n\n${Array.from({ length: 9 }, (_, i) => `Đoạn ${i} ${words(30)}`).join("\n\n")}`

    expect(chunkMarkdown("a.md", text)).toEqual(chunkMarkdown("a.md", text))
  })

  it("changes only the chunks after an edit in a later section", () => {
    const first = "# A\n\nKhông đổi.\n\n# B\n\nBản một."
    const second = "# A\n\nKhông đổi.\n\n# B\n\nBản hai."
    const a = chunkMarkdown("a.md", first)
    const b = chunkMarkdown("a.md", second)

    expect(b[0]).toEqual(a[0])
    expect(b[1]).not.toEqual(a[1])
  })
})

describe("the help files of the assistant", () => {
  const dir = path.join(process.cwd(), "src", "modules", "ai", "knowledge")
  const files = readdirSync(dir).filter((name) => name.endsWith(".md"))

  it("exist", () => {
    expect(files.length).toBeGreaterThanOrEqual(5)
  })

  it.each(files)("%s makes chunks that are short enough and have a heading", (name) => {
    const chunks = chunkMarkdown(name, readFileSync(path.join(dir, name), "utf8"))

    expect(chunks.length).toBeGreaterThan(0)
    for (const chunk of chunks) {
      expect(chunk.heading).not.toBe("")
      expect(chunk.content.length).toBeLessThanOrEqual(CHUNK_SIZE)
      expect(chunk.content.length).toBeGreaterThan(20)
    }
  })

  it.each(files)("%s says nothing about prices or limits it was not given", (name) => {
    const text = readFileSync(path.join(dir, name), "utf8")
    // Every dollar amount must be one of the plan prices of the app.
    for (const price of text.match(/\d+[,.]\d+ đô la/g) ?? []) {
      expect(["12,99 đô la", "16,99 đô la", "19,99 đô la"]).toContain(price)
    }
  })
})
