import { isLyricsLanguage } from "./languages"
import {
  hasWords,
  isBlank,
  MAX_LINE_CHARACTERS,
  MAX_LINES,
  MAX_TOTAL_CHARACTERS,
  type LyricsDraft,
} from "./lyrics-text"
import { formatClock } from "./time"

export interface LyricsToSave extends LyricsDraft {
  language: string
}

const TIMING_ERRORS_SHOWN = 3

/**
 * What would make the API refuse these lyrics, found before they are sent. Expects lines as the
 * API keeps them (see `normalizeDraft`). Returns messages for the person; empty = fine.
 *
 * Timings must not go back in time. A blank line may start at the same moment as the line after
 * it (it only marks a pause), but two lines with words need different start times.
 */
export function validateLyrics({ language, lines, timingsMs }: LyricsToSave): string[] {
  const errors: string[] = []
  if (!isLyricsLanguage(language)) errors.push("Hãy chọn ngôn ngữ của lời.")
  if (!hasWords(lines)) errors.push("Lời bài hát không được để trống.")
  if (lines.length > MAX_LINES) errors.push(`Lời bài hát tối đa ${MAX_LINES} dòng.`)
  const longest = lines.findIndex((line) => line.length > MAX_LINE_CHARACTERS)
  if (longest >= 0) {
    errors.push(`Dòng ${longest + 1} dài quá ${MAX_LINE_CHARACTERS} ký tự.`)
  }
  if (lines.reduce((sum, line) => sum + line.length, 0) > MAX_TOTAL_CHARACTERS) {
    errors.push(`Lời bài hát tối đa ${MAX_TOTAL_CHARACTERS} ký tự.`)
  }
  if (timingsMs !== null) errors.push(...validateTimings(lines, timingsMs))
  return errors
}

export function validateTimings(lines: readonly string[], timingsMs: readonly number[]): string[] {
  if (timingsMs.length !== lines.length) {
    return [`Số mốc thời gian (${timingsMs.length}) phải bằng số dòng lời (${lines.length}).`]
  }
  const problems: string[] = []
  let previous = -1
  let previousWithWords = -1
  timingsMs.forEach((time, index) => {
    if (!Number.isInteger(time) || time < 0) {
      problems.push(`Dòng ${index + 1}: mốc thời gian không hợp lệ.`)
      return
    }
    if (time < previous) {
      problems.push(
        `Dòng ${index + 1}: mốc ${formatClock(time)} sớm hơn dòng trước (${formatClock(previous)}).`,
      )
    } else if (!isBlank(lines[index]) && time <= previousWithWords) {
      problems.push(`Dòng ${index + 1}: mốc ${formatClock(time)} trùng với dòng có lời trước đó.`)
    }
    previous = Math.max(previous, time)
    if (!isBlank(lines[index])) previousWithWords = Math.max(previousWithWords, time)
  })
  if (problems.length > TIMING_ERRORS_SHOWN) {
    const more = problems.length - TIMING_ERRORS_SHOWN
    return [...problems.slice(0, TIMING_ERRORS_SHOWN), `… và ${more} lỗi mốc thời gian khác.`]
  }
  return problems
}
