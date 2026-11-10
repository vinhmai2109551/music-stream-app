import { normalize } from "../../shared/vectors/vector-math.js"

/** A liked track weighs as much as this many fresh listens. */
export const LIKE_WEIGHT = 3
/** Only listens this recent count. */
export const PLAY_WINDOW_DAYS = 30
/** A listen loses half of its weight every this many days. */
export const PLAY_HALF_LIFE_DAYS = 10

const DAY_MS = 24 * 60 * 60 * 1000

/** What the user did with one track. */
export interface TasteSignal {
  trackId: string
  liked: boolean
  /** Dates of the listens inside the window. */
  playedAt: readonly Date[]
}

/** Weight of one listen `ageDays` ago: 1 now, 1/2 after the half-life, 0 outside the window. */
export function playWeight(ageDays: number): number {
  if (ageDays < 0) return 1
  if (ageDays > PLAY_WINDOW_DAYS) return 0
  return 0.5 ** (ageDays / PLAY_HALF_LIFE_DAYS)
}

/** Weight of a track in the taste of the user at `now`. */
export function signalWeight(signal: TasteSignal, now: Date): number {
  const plays = signal.playedAt.reduce(
    (sum, date) => sum + playWeight((now.getTime() - date.getTime()) / DAY_MS),
    0,
  )
  return (signal.liked ? LIKE_WEIGHT : 0) + plays
}

/**
 * The taste of a user: the weighted mean of the (unit) vectors of the tracks they liked and played,
 * scaled to length 1. A track without a vector, or with no weight, is left out. Null when nothing
 * is left, which is the cold start: nothing is known about the user yet.
 */
export function buildTasteVector(
  signals: readonly TasteSignal[],
  vectors: ReadonlyMap<string, readonly number[]>,
  now: Date = new Date(),
): number[] | null {
  let sum: number[] | null = null
  for (const signal of signals) {
    const vector = vectors.get(signal.trackId)
    const weight = signalWeight(signal, now)
    if (!vector || weight <= 0) continue
    const unit = normalize(vector)
    sum ??= new Array<number>(unit.length).fill(0)
    for (let index = 0; index < unit.length; index += 1) sum[index] += unit[index] * weight
  }
  if (!sum) return null
  const taste = normalize(sum)
  return taste.some((value) => value !== 0) ? taste : null
}
