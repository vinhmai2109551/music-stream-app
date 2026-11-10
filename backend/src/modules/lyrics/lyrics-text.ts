import { createHash } from "node:crypto"

/** Limits that keep one song's lyrics (and so its translation) from using up the allowance. */
export const MAX_LINES = 500
export const MAX_LINE_CHARACTERS = 500
export const MAX_TOTAL_CHARACTERS = 20_000

/**
 * The lines as they are stored: a line break inside a text starts a new line, spaces at the end of
 * a line are cut, blank lines stay where they are (a verse break is a blank line), and blank lines
 * at the very end are dropped.
 */
export function normalizeLines(lines: readonly string[]): string[] {
  const out = lines.flatMap((text) => text.split(/\r\n|\r|\n/)).map((line) => line.trimEnd())
  while (out.length > 0 && out[out.length - 1] === "") out.pop()
  return out
}

/** True when at least one line has a word (a text of blank lines is not lyrics). */
export const hasWords = (lines: readonly string[]): boolean =>
  lines.some((line) => line.trim() !== "")

export const totalCharacters = (lines: readonly string[]): number =>
  lines.reduce((sum, line) => sum + line.length, 0)

/**
 * Identifies one version of the lyrics: a translation is made for a hash and valid for that hash
 * only, so lyrics that change are translated again instead of showing an out-of-date text.
 */
export function lyricsContentHash(language: string, lines: readonly string[]): string {
  return createHash("sha256")
    .update(language)
    .update("\u0000")
    .update(lines.join("\n"))
    .digest("hex")
}
