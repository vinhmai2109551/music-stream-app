const pad = (value: number, size = 2): string => String(value).padStart(size, "0")

/** `83450` -> `01:23.45` (minutes, seconds and hundredths, as in an LRC file). */
export function formatClock(ms: number): string {
  const centis = Math.max(0, Math.round(ms / 10))
  const minutes = Math.floor(centis / 6000)
  const seconds = Math.floor((centis % 6000) / 100)
  return `${pad(minutes)}:${pad(seconds)}.${pad(centis % 100)}`
}

/**
 * The reverse of `formatClock`, forgiving: `1:23.45`, `01:23`, `83.45` and `83` all work; a comma
 * works as the decimal mark. Returns milliseconds, or null when the text is not a time.
 */
export function parseClock(text: string): number | null {
  const match = /^(?:(\d+):)?(\d+)(?:[.,](\d{1,3}))?$/.exec(text.trim())
  if (!match) return null
  const [, minutes, seconds, fraction] = match
  if (minutes !== undefined && Number(seconds) >= 60) return null
  const millis = fraction === undefined ? 0 : Number(fraction.padEnd(3, "0"))
  return (Number(minutes ?? 0) * 60 + Number(seconds)) * 1000 + millis
}

/** `205` -> `3:25`. */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds))
  return `${Math.floor(seconds / 60)}:${pad(seconds % 60)}`
}

/** `1234567` -> `1.234.567` */
export const formatNumber = (value: number): string => new Intl.NumberFormat("vi-VN").format(value)

/** A big count for a small place: `25533100003` -> `25,5 tỷ`, `1234567` -> `1,2 triệu`, else `formatNumber`. */
export function formatCompact(value: number): string {
  const short = (divided: number) =>
    new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(divided)
  if (value >= 1_000_000_000) return `${short(value / 1_000_000_000)} tỷ`
  if (value >= 1_000_000) return `${short(value / 1_000_000)} triệu`
  return formatNumber(value)
}
