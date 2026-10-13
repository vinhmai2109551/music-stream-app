const MIN_HEIGHT = 0.25

/** Small seeded PRNG so every track gets its own stable waveform shape. */
function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hash(text: string): number {
  let value = 2166136261
  for (let i = 0; i < text.length; i++) {
    value ^= text.charCodeAt(i)
    value = Math.imul(value, 16777619)
  }
  return value >>> 0
}

/** Returns `count` bar heights in the range 0.25–1, smoothed so the shape looks like audio. */
export function createWaveform(seed: string, count: number): number[] {
  const random = mulberry32(hash(seed))
  const raw = Array.from({ length: count }, () => random())
  return raw.map((value, index) => {
    const prev = raw[index - 1] ?? value
    const next = raw[index + 1] ?? value
    const smooth = (prev + value * 2 + next) / 4
    return MIN_HEIGHT + smooth * (1 - MIN_HEIGHT)
  })
}
