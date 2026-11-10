/** Limits of the API (backend lyrics-text.ts): they keep a song from using up the DeepL allowance. */
export const MAX_LINES = 500
export const MAX_LINE_CHARACTERS = 500
export const MAX_TOTAL_CHARACTERS = 20_000

export const isBlank = (line: string): boolean => line.trim() === ""

/** Pasted text -> one element per line. Spaces at the end of a line are cut; a blank line stays. */
export function splitLines(text: string): string[] {
  return text.split(/\r\n|\r|\n/).map((line) => line.trimEnd())
}

export interface LyricsDraft {
  lines: string[]
  /** Start of each line in ms, same length as `lines`; null = no timings. */
  timingsMs: number[] | null
}

/**
 * The lines as the API keeps them (it cuts spaces at the end of a line and drops blank lines at
 * the very end). The API compares the number of timings with the number of lines it keeps, so the
 * timings must be cut the same way before they are sent.
 */
export function normalizeDraft(draft: LyricsDraft): LyricsDraft {
  const lines = draft.lines.map((line) => line.trimEnd())
  const timings =
    draft.timingsMs !== null && draft.timingsMs.length === lines.length ? draft.timingsMs : null
  let end = lines.length
  while (end > 0 && lines[end - 1] === "") end -= 1
  return {
    lines: lines.slice(0, end),
    timingsMs: timings === null ? null : timings.slice(0, end),
  }
}

export const hasWords = (lines: readonly string[]): boolean => lines.some((line) => !isBlank(line))
