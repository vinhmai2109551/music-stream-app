/** Size aimed at for a chunk, in characters: long enough to hold an answer, short enough to match one. */
export const CHUNK_SIZE = 500
/** Characters repeated at the start of the next chunk, so a sentence cut in two is found by either. */
export const CHUNK_OVERLAP = 50

export interface KnowledgeChunkText {
  /** File name, e.g. "premium.md". */
  source: string
  /** Nearest heading above the chunk ("" before the first heading). */
  heading: string
  /** Order of the chunk inside its file, from 0. */
  position: number
  content: string
}

export interface ChunkOptions {
  size?: number
  overlap?: number
}

interface Section {
  heading: string
  body: string
}

/** `## Title`, with an optional closing `##` that must be set apart by a space (so "C#" stays "C#"). */
const HEADING = /^(#{1,6})[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/
const FENCE = /^\s*(`{3,}|~{3,})/
/** Joins the headings above a chunk into one citation: "Premium › Các gói". */
const BREADCRUMB_SEPARATOR = " › "

/**
 * The text split at its headings; the text before the first heading has the heading "". A heading
 * carries the headings above it ("Premium › Các gói"), so a chunk keeps its topic even when its
 * parent heading has no text of its own.
 */
function sections(markdown: string): Section[] {
  const result: Section[] = []
  const trail: { level: number; title: string }[] = []
  let lines: string[] = []
  // The marker that opened the code block we are in, if any: only the same marker, at least as
  // long, closes it.
  let fence: string | null = null
  const flush = () => {
    const body = lines.join("\n").trim()
    const heading = trail.map((entry) => entry.title).join(BREADCRUMB_SEPARATOR)
    if (body) result.push({ heading, body })
    lines = []
  }
  for (const line of markdown.replace(/\r\n?/g, "\n").split("\n")) {
    const marker = FENCE.exec(line)?.[1]
    if (marker) {
      if (fence === null) fence = marker
      else if (marker[0] === fence[0] && marker.length >= fence.length) fence = null
    }
    const match = marker || fence !== null ? null : HEADING.exec(line)
    if (match) {
      flush()
      const level = match[1].length
      while (trail.length > 0 && trail[trail.length - 1].level >= level) trail.pop()
      trail.push({ level, title: match[2].trim() })
    } else {
      lines.push(line)
    }
  }
  flush()
  return result
}

/** Pieces of a section that are kept whole when they fit: paragraphs, then lines, then sentences. */
function units(body: string, size: number): string[] {
  return body
    .split(/\n{2,}/)
    .flatMap((paragraph) => {
      const text = paragraph.trim()
      if (text.length <= size) return [text]
      return text.split("\n").flatMap((line) => {
        const trimmed = line.trim()
        return trimmed.length <= size ? [trimmed] : sentences(trimmed, size)
      })
    })
    .filter((unit) => unit.length > 0)
}

function sentences(text: string, size: number): string[] {
  return text
    .split(/(?<=[.!?…。])\s+/)
    .flatMap((sentence) => (sentence.length <= size ? [sentence] : byWords(sentence, size)))
}

/** The last resort for a sentence longer than a chunk: cut at spaces. */
function byWords(text: string, size: number): string[] {
  const parts: string[] = []
  let current = ""
  for (const word of text.split(/\s+/)) {
    if (word.length > size) {
      // A "word" longer than a chunk (a long URL): cut it where it is.
      if (current) parts.push(current)
      current = ""
      for (let start = 0; start < word.length; start += size)
        parts.push(word.slice(start, start + size))
    } else if (current && current.length + 1 + word.length > size) {
      parts.push(current)
      current = word
    } else {
      current = current ? `${current} ${word}` : word
    }
  }
  if (current) parts.push(current)
  return parts
}

/** The end of `text`, at most `overlap` characters, starting at a word. */
function tail(text: string, overlap: number): string {
  if (overlap <= 0 || text.length <= overlap) return overlap <= 0 ? "" : text
  const cut = text.slice(text.length - overlap)
  const firstSpace = cut.search(/\s/)
  // Cut inside a word: drop the broken start of it.
  const startsMidWord = !/\s/.test(text[text.length - overlap - 1] ?? " ")
  return (startsMidWord && firstSpace >= 0 ? cut.slice(firstSpace) : cut).trim()
}

function chunkSection(body: string, size: number, overlap: number): string[] {
  const chunks: string[] = []
  let current = ""
  for (const unit of units(body, size)) {
    const joined = current ? `${current}\n${unit}` : unit
    if (current && joined.length > size) {
      chunks.push(current)
      const carried = tail(current, overlap)
      current = carried && carried.length + 1 + unit.length <= size ? `${carried}\n${unit}` : unit
    } else {
      current = joined
    }
  }
  if (current) chunks.push(current)
  return chunks
}

/**
 * Splits a Markdown file into chunks of about `size` characters that overlap by `overlap`.
 * A chunk never crosses a heading, so each one belongs to one topic and can name it; inside a
 * section the text is cut at paragraphs, then lines, then sentences, and only as a last resort at
 * words. A section that fits in one chunk stays one chunk. The same text always gives the same
 * chunks (the index relies on that to find out what changed).
 */
export function chunkMarkdown(
  source: string,
  markdown: string,
  { size = CHUNK_SIZE, overlap = CHUNK_OVERLAP }: ChunkOptions = {},
): KnowledgeChunkText[] {
  if (size <= 0) throw new Error("The chunk size must be positive")
  if (overlap < 0 || overlap >= size) throw new Error("The overlap must be smaller than the size")
  const chunks: KnowledgeChunkText[] = []
  for (const section of sections(markdown)) {
    for (const content of chunkSection(section.body, size, overlap)) {
      chunks.push({ source, heading: section.heading, position: chunks.length, content })
    }
  }
  return chunks
}
