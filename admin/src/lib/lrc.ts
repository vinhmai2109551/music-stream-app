import { formatClock } from "./time"

export interface LrcResult {
  lines: string[]
  /** Start of each line in ms (same length as `lines`); null when the file has no time tags. */
  timingsMs: number[] | null
}

interface Entry {
  timeMs: number | null
  text: string
}

const TIME_TAG = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/y
const META_TAG = /^\[([A-Za-z]+):(.*)\]\s*$/
/** Word-level tags of "enhanced" LRC (`<00:12.30>`): only the line time is kept. */
const WORD_TAG = /<\d{1,3}:\d{1,2}(?:[.:]\d{1,3})?>/g

/** A file saved with a byte order mark starts with this character. */
const stripBom = (text: string): string => (text.charCodeAt(0) === 0xfeff ? text.slice(1) : text)

const toMs = (minutes: string, seconds: string, fraction: string | undefined): number =>
  (Number(minutes) * 60 + Number(seconds)) * 1000 +
  (fraction === undefined ? 0 : Number(fraction.padEnd(3, "0")))

/** Reads the time tags at the start of `line`; returns them and the text that follows. */
function readTags(line: string): { times: number[]; text: string } {
  const times: number[] = []
  let position = 0
  for (;;) {
    TIME_TAG.lastIndex = position
    const match = TIME_TAG.exec(line)
    if (!match) break
    times.push(toMs(match[1], match[2], match[3]))
    position = TIME_TAG.lastIndex
  }
  return { times, text: line.slice(position).replace(WORD_TAG, "").trimEnd() }
}

/**
 * Parses an LRC file (`[mm:ss.xx]text`). A line with several tags (`[00:10.00][00:50.00]Chorus`)
 * becomes several lines, `[offset:+500]` shifts every time, and other `[ar:...]`-style tags are
 * ignored. A file without any time tag gives plain lines and no timings. A line without a tag in
 * a timed file takes the time of the line before it.
 */
export function parseLrc(text: string): LrcResult {
  let offsetMs = 0
  const entries: Entry[] = []
  for (const raw of stripBom(text).split(/\r\n|\r|\n/)) {
    const meta = META_TAG.exec(raw.trim())
    if (meta && !/^\d/.test(meta[1])) {
      if (meta[1].toLowerCase() === "offset") offsetMs = Number.parseInt(meta[2], 10) || 0
      continue
    }
    const { times, text: lineText } = readTags(raw.trimStart())
    if (times.length === 0)
      entries.push({ timeMs: null, text: raw.replace(WORD_TAG, "").trimEnd() })
    else for (const timeMs of times) entries.push({ timeMs, text: lineText })
  }

  if (entries.every((entry) => entry.timeMs === null)) {
    return { lines: entries.map((entry) => entry.text), timingsMs: null }
  }

  let previous = 0
  const timed = entries.map((entry) => {
    previous = entry.timeMs ?? previous
    return { timeMs: Math.max(0, previous + offsetMs), text: entry.text }
  })
  // Array.prototype.sort is stable: lines with the same time keep the order of the file.
  timed.sort((a, b) => a.timeMs - b.timeMs)
  return { lines: timed.map((entry) => entry.text), timingsMs: timed.map((entry) => entry.timeMs) }
}

/** Writes lyrics as LRC; without timings it is just the lines. */
export function toLrc(lines: readonly string[], timingsMs: readonly number[] | null): string {
  if (timingsMs === null || timingsMs.length !== lines.length) return lines.join("\n")
  return lines.map((line, index) => `[${formatClock(timingsMs[index])}]${line}`).join("\n")
}
