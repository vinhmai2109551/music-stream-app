function compact(value: number, divisor: number, suffix: string): string {
  const scaled = value / divisor
  const text = scaled >= 100 ? scaled.toFixed(0) : scaled.toFixed(1).replace(/\.0$/, "")
  return `${text}${suffix}`
}

/** 2100000 -> "2.1M", 65100 -> "65.1K". */
export function formatCount(value: number): string {
  if (value >= 1_000_000) return compact(value, 1_000_000, "M")
  if (value >= 1_000) return compact(value, 1_000, "K")
  return String(value)
}

/** 1234 -> "1,234". */
export function formatNumber(value: number): string {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}
