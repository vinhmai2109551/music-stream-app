import { describe, expect, it } from "@jest/globals"
import { mean, ndcgAtK, recallAtK, reciprocalRank } from "./metrics.js"

const rel = (...ids: string[]) => new Set(ids)

describe("recallAtK", () => {
  it("is the share of the relevant items found in the first k", () => {
    expect(recallAtK(["a", "x", "b", "y"], rel("a", "b", "c", "d"), 4)).toBe(0.5)
  })

  it("only looks at the first k", () => {
    expect(recallAtK(["x", "y", "a"], rel("a"), 2)).toBe(0)
    expect(recallAtK(["x", "y", "a"], rel("a"), 3)).toBe(1)
  })

  it("is 1 when everything relevant is found and 0 when nothing is", () => {
    expect(recallAtK(["a", "b"], rel("a", "b"), 10)).toBe(1)
    expect(recallAtK(["x"], rel("a"), 10)).toBe(0)
    expect(recallAtK([], rel("a"), 10)).toBe(0)
  })

  it("cannot reach 1 when more than k items are relevant", () => {
    const many = rel(...Array.from({ length: 12 }, (_, i) => `r${i}`))
    const ranked = Array.from({ length: 10 }, (_, i) => `r${i}`)
    expect(recallAtK(ranked, many, 10)).toBeCloseTo(10 / 12)
  })

  it("counts an item that is listed twice once", () => {
    expect(recallAtK(["a", "a", "a"], rel("a", "b"), 3)).toBe(0.5)
  })

  it("is 0 when nothing is relevant (not a division by zero)", () => {
    expect(recallAtK(["a"], rel(), 10)).toBe(0)
  })
})

describe("reciprocalRank", () => {
  it("is 1 over the position of the first relevant result", () => {
    expect(reciprocalRank(["a", "x"], rel("a"))).toBe(1)
    expect(reciprocalRank(["x", "a"], rel("a"))).toBe(1 / 2)
    expect(reciprocalRank(["x", "y", "z", "b", "a"], rel("a", "b"))).toBe(1 / 4)
  })

  it("is 0 when no result is relevant", () => {
    expect(reciprocalRank(["x", "y"], rel("a"))).toBe(0)
    expect(reciprocalRank([], rel("a"))).toBe(0)
  })
})

describe("ndcgAtK", () => {
  it("is 1 when the relevant items come first", () => {
    expect(ndcgAtK(["a", "b", "x"], rel("a", "b"), 10)).toBeCloseTo(1)
  })

  it("is 0 when no relevant item is in the first k", () => {
    expect(ndcgAtK(["x", "y"], rel("a"), 10)).toBe(0)
    expect(ndcgAtK(["x", "a"], rel("a"), 1)).toBe(0)
  })

  it("is lower the further down the relevant item is", () => {
    const first = ndcgAtK(["a", "x", "y"], rel("a"), 10)
    const second = ndcgAtK(["x", "a", "y"], rel("a"), 10)
    const third = ndcgAtK(["x", "y", "a"], rel("a"), 10)

    expect(first).toBe(1)
    expect(second).toBeCloseTo(1 / Math.log2(3))
    expect(third).toBeCloseTo(1 / Math.log2(4))
    expect(first).toBeGreaterThan(second)
    expect(second).toBeGreaterThan(third)
  })

  it("rewards putting a relevant item above an irrelevant one", () => {
    expect(ndcgAtK(["a", "x", "b"], rel("a", "b"), 3)).toBeGreaterThan(
      ndcgAtK(["x", "a", "b"], rel("a", "b"), 3),
    )
  })

  it("is 1 for the best possible list even when more than k items are relevant", () => {
    const many = rel(...Array.from({ length: 12 }, (_, i) => `r${i}`))
    const ranked = Array.from({ length: 10 }, (_, i) => `r${i}`)
    expect(ndcgAtK(ranked, many, 10)).toBeCloseTo(1)
  })

  it("is worked out by hand for a known case", () => {
    // Relevant at positions 1 and 3 of 2 relevant: DCG = 1 + 1/2 = 1.5; ideal = 1 + 1/log2(3).
    const expected = 1.5 / (1 + 1 / Math.log2(3))
    expect(ndcgAtK(["a", "x", "b"], rel("a", "b"), 10)).toBeCloseTo(expected)
  })

  it("counts an item that is listed twice once, so it can never go above 1", () => {
    expect(ndcgAtK(["a", "a", "a"], rel("a"), 3)).toBe(1)
  })

  it("is 0 when nothing is relevant", () => {
    expect(ndcgAtK(["a"], rel(), 10)).toBe(0)
  })
})

describe("mean", () => {
  it("averages, and gives 0 for nothing", () => {
    expect(mean([1, 2, 3])).toBe(2)
    expect(mean([])).toBe(0)
  })
})
