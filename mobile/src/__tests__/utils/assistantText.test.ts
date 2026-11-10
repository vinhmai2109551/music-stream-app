import { describe, expect, it } from "@jest/globals"
import { parseBlocks, parseSpans, plainText } from "@/utils/assistantText"

describe("parseSpans", () => {
  it("gives plain text as one span", () => {
    expect(parseSpans("Xin chào")).toEqual([{ text: "Xin chào", bold: false }])
  })

  it("marks the words between ** as bold", () => {
    expect(parseSpans("Nghe **Lạc Trôi** nhé")).toEqual([
      { text: "Nghe ", bold: false },
      { text: "Lạc Trôi", bold: true },
      { text: " nhé", bold: false },
    ])
  })

  it("handles several bold parts and a bold start or end", () => {
    expect(parseSpans("**A** và **B**")).toEqual([
      { text: "A", bold: true },
      { text: " và ", bold: false },
      { text: "B", bold: true },
    ])
  })

  it("does not show a ** that never closes (the answer is still being written)", () => {
    expect(parseSpans("Nghe **Lạc Tr")).toEqual(
      [
        { text: "Nghe ", bold: false },
        { text: "Lạc Tr", bold: false },
      ].reduce<{ text: string; bold: boolean }[]>((all, span) => {
        const last = all[all.length - 1]
        return last && last.bold === span.bold
          ? [...all.slice(0, -1), { ...last, text: last.text + span.text }]
          : [...all, span]
      }, []),
    )
  })

  it("gives nothing for nothing and for only markers", () => {
    expect(parseSpans("")).toEqual([])
    expect(parseSpans("****")).toEqual([])
  })
})

describe("parseBlocks", () => {
  it("makes a paragraph of lines that follow each other", () => {
    expect(parseBlocks("Dòng một\ndòng hai")).toEqual([
      { type: "paragraph", spans: [{ text: "Dòng một dòng hai", bold: false }] },
    ])
  })

  it("separates paragraphs at blank lines", () => {
    const blocks = parseBlocks("Một\n\nHai\n\n\nBa")
    expect(blocks.map((block) => block.type)).toEqual(["paragraph", "paragraph", "paragraph"])
  })

  it("makes a list of bullets of lines that start with - or *", () => {
    expect(parseBlocks("- một\n* hai\n• ba")).toEqual([
      {
        type: "bullets",
        items: [
          [{ text: "một", bold: false }],
          [{ text: "hai", bold: false }],
          [{ text: "ba", bold: false }],
        ],
      },
    ])
  })

  it("makes a numbered list and keeps the numbers", () => {
    const [block] = parseBlocks("1. Lo-fi\n2) Piano\n3. Jazz")
    expect(block).toMatchObject({ type: "numbers" })
    if (block.type !== "numbers") throw new Error("not a list")
    expect(block.items.map((item) => item.number)).toEqual([1, 2, 3])
  })

  it("puts bold words inside list items", () => {
    const [block] = parseBlocks("1. **Lo-fi:** nhẹ nhàng")
    if (block.type !== "numbers") throw new Error("not a list")
    expect(block.items[0].spans).toEqual([
      { text: "Lo-fi:", bold: true },
      { text: " nhẹ nhàng", bold: false },
    ])
  })

  it("ends a paragraph where a list begins, and a list where a paragraph begins", () => {
    const blocks = parseBlocks("Gợi ý:\n- một\n- hai\nHết.")
    expect(blocks.map((block) => block.type)).toEqual(["paragraph", "bullets", "paragraph"])
  })

  it("shows a heading as a short bold paragraph, without its #", () => {
    expect(parseBlocks("## Gợi ý")).toEqual([
      { type: "paragraph", spans: [{ text: "Gợi ý", bold: true }] },
    ])
  })

  it("accepts Windows line ends and trailing spaces", () => {
    expect(parseBlocks("a  \r\nb\r\n\r\nc")).toHaveLength(2)
  })

  it("gives nothing for no text", () => {
    expect(parseBlocks("")).toEqual([])
    expect(parseBlocks("  \n \n")).toEqual([])
  })

  it("keeps text that only looks like a list", () => {
    const blocks = parseBlocks("2026 là năm mới\n-không phải gạch đầu dòng")
    expect(blocks.map((block) => block.type)).toEqual(["paragraph"])
  })
})

describe("plainText", () => {
  it("is the text without the markers, lists kept as lines", () => {
    expect(plainText("Nghe **Lạc Trôi**:\n- một\n- hai\n\n1. a\n2. b")).toBe(
      "Nghe Lạc Trôi:\n\n- một\n- hai\n\n1. a\n2. b",
    )
  })
})
