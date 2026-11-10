import { describe, expect, it } from "@jest/globals"
import { cosineSimilarity } from "../../shared/vectors/vector-math.js"
import {
  buildTasteVector,
  LIKE_WEIGHT,
  PLAY_HALF_LIFE_DAYS,
  PLAY_WINDOW_DAYS,
  playWeight,
  signalWeight,
  type TasteSignal,
} from "./taste-profile.js"

const NOW = new Date("2026-11-08T12:00:00Z")
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000)

const X = [1, 0, 0]
const Y = [0, 1, 0]
const vectors = new Map<string, readonly number[]>([
  ["x", X],
  ["y", Y],
])
const liked = (trackId: string): TasteSignal => ({ trackId, liked: true, playedAt: [] })
const played = (trackId: string, ...days: number[]): TasteSignal => ({
  trackId,
  liked: false,
  playedAt: days.map(daysAgo),
})

describe("playWeight", () => {
  it("is 1 for a listen right now and 1/2 after the half-life", () => {
    expect(playWeight(0)).toBe(1)
    expect(playWeight(PLAY_HALF_LIFE_DAYS)).toBeCloseTo(0.5)
    expect(playWeight(PLAY_HALF_LIFE_DAYS * 2)).toBeCloseTo(0.25)
  })

  it("never grows with age", () => {
    const weights = [0, 1, 5, 10, 20, 30].map(playWeight)
    expect(weights).toEqual([...weights].sort((a, b) => b - a))
  })

  it("counts a listen on the last day of the window and none after it", () => {
    expect(playWeight(PLAY_WINDOW_DAYS)).toBeGreaterThan(0)
    expect(playWeight(PLAY_WINDOW_DAYS + 0.01)).toBe(0)
  })

  it("treats a date slightly in the future (clock skew) as now", () => {
    expect(playWeight(-0.2)).toBe(1)
  })
})

describe("signalWeight", () => {
  it("is 3 for a like with no listens", () => {
    expect(signalWeight(liked("x"), NOW)).toBe(LIKE_WEIGHT)
  })

  it("adds the listens to the like", () => {
    const both: TasteSignal = { trackId: "x", liked: true, playedAt: [daysAgo(0), daysAgo(0)] }
    expect(signalWeight(both, NOW)).toBe(LIKE_WEIGHT + 2)
  })

  it("is 0 for a listen outside the window", () => {
    expect(signalWeight(played("x", 45), NOW)).toBe(0)
  })
})

describe("buildTasteVector", () => {
  it("is null with no signals: the cold start", () => {
    expect(buildTasteVector([], vectors, NOW)).toBeNull()
  })

  it("is null when no signal has a vector or a weight", () => {
    expect(buildTasteVector([liked("unknown")], vectors, NOW)).toBeNull()
    expect(buildTasteVector([played("x", 90)], vectors, NOW)).toBeNull()
  })

  it("has length 1", () => {
    const taste = buildTasteVector([liked("x"), played("y", 1)], vectors, NOW)!
    expect(Math.hypot(...taste)).toBeCloseTo(1)
  })

  it("points to the only track there is", () => {
    expect(buildTasteVector([liked("x")], vectors, NOW)).toEqual(X)
  })

  it("leans to the liked track over a listened one (3 against 1)", () => {
    const taste = buildTasteVector([liked("x"), played("y", 0)], vectors, NOW)!
    expect(cosineSimilarity(taste, X)).toBeGreaterThan(cosineSimilarity(taste, Y))
    expect(taste[0] / taste[1]).toBeCloseTo(3)
  })

  it("leans to a recent listen over an old one", () => {
    const taste = buildTasteVector([played("x", 0), played("y", 20)], vectors, NOW)!
    expect(taste[0]).toBeGreaterThan(taste[1])
  })

  it("counts every listen of a track", () => {
    const taste = buildTasteVector([played("x", 0, 0, 0), played("y", 0)], vectors, NOW)!
    expect(taste[0] / taste[1]).toBeCloseTo(3)
  })

  it("does not depend on how long the stored vectors are", () => {
    const long = new Map<string, readonly number[]>([
      ["x", [10, 0, 0]],
      ["y", [0, 0.1, 0]],
    ])
    const taste = buildTasteVector([played("x", 0), played("y", 0)], long, NOW)!
    expect(taste[0]).toBeCloseTo(taste[1])
  })

  it("skips a track without a vector and uses the rest", () => {
    expect(buildTasteVector([liked("unknown"), liked("y")], vectors, NOW)).toEqual(Y)
  })

  it("is null when the tracks cancel each other out", () => {
    const opposite = new Map<string, readonly number[]>([
      ["a", X],
      ["b", [-1, 0, 0]],
    ])
    expect(buildTasteVector([liked("a"), liked("b")], opposite, NOW)).toBeNull()
  })
})
