import { isBlank } from "./lyrics-text"

/**
 * Start time of each line in ms while the person taps along with the song; null = not set yet.
 *
 * Only lines with words are tapped. A blank line (a pause between verses) is never tapped: it gets
 * the time of the next line with words, which is when its pause ends.
 */
export type Marks = (number | null)[]

export const emptyMarks = (lines: readonly string[]): Marks => lines.map(() => null)

/** Marks that start from timings already saved (so a synced song can be corrected, not redone). */
export function marksFromTimings(
  lines: readonly string[],
  timingsMs: readonly number[] | null,
): Marks {
  return timingsMs !== null && timingsMs.length === lines.length
    ? [...timingsMs]
    : emptyMarks(lines)
}

function lastMarkedIndex(marks: Marks): number {
  for (let index = marks.length - 1; index >= 0; index -= 1) {
    if (marks[index] !== null) return index
  }
  return -1
}

/** The line waiting for its start time: the first line with words after the last marked one. */
export function nextPending(lines: readonly string[], marks: Marks): number | null {
  for (let index = lastMarkedIndex(marks) + 1; index < lines.length; index += 1) {
    if (!isBlank(lines[index])) return index
  }
  return null
}

/**
 * The start time of the next waiting line is `timeMs`. Returns the new marks, or null when there is
 * nothing to mark or `timeMs` is not later than the previous mark (the song was rewound).
 */
export function applyTap(lines: readonly string[], marks: Marks, timeMs: number): Marks | null {
  const target = nextPending(lines, marks)
  if (target === null) return null
  const last = lastMarkedIndex(marks)
  if (last >= 0 && timeMs <= (marks[last] as number)) return null

  const next = [...marks]
  next[target] = timeMs
  for (let index = target - 1; index > last && isBlank(lines[index]); index -= 1) {
    next[index] = timeMs
  }
  return next
}

/** Takes back the last tap (and the blank lines that went with it). */
export function undoTap(lines: readonly string[], marks: Marks): Marks {
  const last = lastMarkedIndex(marks)
  if (last < 0) return marks
  const next = [...marks]
  next[last] = null
  for (
    let index = last - 1;
    index >= 0 && isBlank(lines[index]) && next[index] !== null;
    index -= 1
  ) {
    next[index] = null
  }
  return next
}

export const markedCount = (lines: readonly string[], marks: Marks): number =>
  lines.filter((line, index) => !isBlank(line) && marks[index] !== null).length

export const wordLineCount = (lines: readonly string[]): number =>
  lines.filter((line) => !isBlank(line)).length

/**
 * The timings to save: every line needs one. Blank lines after the last line with words (nothing
 * follows to give them a time) take the time of that last line. Null while a line with words is
 * still waiting for its mark.
 */
export function toTimings(lines: readonly string[], marks: Marks): number[] | null {
  if (lines.length === 0 || marks.length !== lines.length) return null
  const out: number[] = []
  let carry: number | null = null
  for (let index = 0; index < lines.length; index += 1) {
    const mark = marks[index]
    if (mark === null && !isBlank(lines[index])) return null
    out.push(mark ?? carry ?? 0)
    carry = mark ?? carry
  }
  return out
}

/** The line that is being sung at `nowMs`: the last line that started; -1 before the first one. */
export function activeIndex(timingsMs: readonly number[], nowMs: number): number {
  let active = -1
  for (let index = 0; index < timingsMs.length; index += 1) {
    if (timingsMs[index] <= nowMs) active = index
  }
  return active
}

/** Moves one start time by `deltaMs` (never below 0). */
export function nudge(timingsMs: readonly number[], index: number, deltaMs: number): number[] {
  return timingsMs.map((time, position) =>
    position === index ? Math.max(0, time + deltaMs) : time,
  )
}
