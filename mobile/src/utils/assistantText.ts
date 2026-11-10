/** A piece of a line: plain, or bold. */
export interface TextSpan {
  text: string
  bold: boolean
}

/** What the text of an answer is made of: paragraphs and lists, with bold words. */
export type TextBlock =
  | { type: "paragraph"; spans: TextSpan[] }
  | { type: "bullets"; items: TextSpan[][] }
  | { type: "numbers"; items: { number: number; spans: TextSpan[] }[] }

const BULLET = /^\s*[-*•]\s+(.*)$/
const NUMBER = /^\s*(\d{1,3})[.)]\s+(.*)$/
const HEADING = /^\s*#{1,6}\s+(.*)$/

/**
 * The bold parts of a line (`**like this**`). The assistant writes a little Markdown; only bold,
 * lists and paragraphs are shown as such, anything else is plain text. A `**` that never closes
 * (the answer is still being written) is not shown.
 */
export function parseSpans(line: string): TextSpan[] {
  const spans: TextSpan[] = []
  const parts = line.split("**")
  parts.forEach((part, index) => {
    // An odd number of markers leaves the last piece open: show it plain.
    const closes = index % 2 === 1 && index < parts.length - 1
    if (part) spans.push({ text: part, bold: closes })
  })
  return spans.reduce<TextSpan[]>((merged, span) => {
    const last = merged[merged.length - 1]
    if (last && last.bold === span.bold) last.text += span.text
    else merged.push({ ...span })
    return merged
  }, [])
}

/** Cuts the text of an answer into blocks. Blank lines separate paragraphs; a list is a run of lines. */
export function parseBlocks(text: string): TextBlock[] {
  const blocks: TextBlock[] = []
  let paragraph: string[] = []

  const closeParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ type: "paragraph", spans: parseSpans(paragraph.join(" ")) })
      paragraph = []
    }
  }

  for (const raw of text.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trimEnd()
    if (line.trim() === "") {
      closeParagraph()
      continue
    }
    const bullet = BULLET.exec(line)
    const number = NUMBER.exec(line)
    const heading = HEADING.exec(line)
    if (bullet || number) {
      closeParagraph()
      const last = blocks[blocks.length - 1]
      if (bullet) {
        const item = parseSpans(bullet[1])
        if (last?.type === "bullets") last.items.push(item)
        else blocks.push({ type: "bullets", items: [item] })
      } else if (number) {
        const item = { number: Number(number[1]), spans: parseSpans(number[2]) }
        if (last?.type === "numbers") last.items.push(item)
        else blocks.push({ type: "numbers", items: [item] })
      }
    } else if (heading) {
      // A heading is a short bold paragraph.
      closeParagraph()
      blocks.push({
        type: "paragraph",
        spans: [{ text: heading[1].replace(/\*\*/g, ""), bold: true }],
      })
    } else {
      paragraph.push(line.trim())
    }
  }
  closeParagraph()
  return blocks
}

/** The plain text of an answer, for the screen reader and for copying. */
export function plainText(text: string): string {
  return parseBlocks(text)
    .map((block) => {
      const join = (spans: TextSpan[]) => spans.map((span) => span.text).join("")
      if (block.type === "paragraph") return join(block.spans)
      if (block.type === "bullets") return block.items.map((item) => `- ${join(item)}`).join("\n")
      return block.items.map((item) => `${item.number}. ${join(item.spans)}`).join("\n")
    })
    .join("\n\n")
}
