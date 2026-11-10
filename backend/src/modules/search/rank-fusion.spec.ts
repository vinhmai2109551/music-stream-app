import { describe, expect, it } from "@jest/globals"
import { reciprocalRankFusion, RRF_K } from "./rank-fusion.js"

const ids = (lists: string[][]) => reciprocalRankFusion(lists).map((item) => item.id)

describe("reciprocalRankFusion", () => {
  it("scores an item 1 / (60 + rank) in every list that holds it, best first", () => {
    const fused = reciprocalRankFusion([
      ["a", "b"],
      ["b", "c"],
    ])
    const score = (id: string) => fused.find((item) => item.id === id)?.score

    expect(RRF_K).toBe(60)
    expect(fused.map((item) => item.id)).toEqual(["b", "a", "c"])
    expect(score("b")).toBeCloseTo(1 / 62 + 1 / 61)
    expect(score("a")).toBeCloseTo(1 / 61)
    expect(score("c")).toBeCloseTo(1 / 62)
  })

  it("puts an item that is high in both lists above one that is first in only one", () => {
    expect(
      ids([
        ["a", "x", "b"],
        ["y", "b", "z"],
      ])[0],
    ).toBe("b")
  })

  it("tells which lists hold each item", () => {
    const fused = reciprocalRankFusion([["a", "b"], ["b"]])

    expect(fused.find((item) => item.id === "a")?.sources).toEqual([0])
    expect(fused.find((item) => item.id === "b")?.sources).toEqual([0, 1])
  })

  it("keeps the order of a single list", () => {
    expect(ids([["c", "a", "b"]])).toEqual(["c", "a", "b"])
  })

  it("gives the same result however the lists differ in length", () => {
    expect(ids([["a"], ["a", "b", "c"]])).toEqual(["a", "b", "c"])
  })

  it("breaks a tie in favour of the item seen first, in the earlier list", () => {
    // a is first in list 0 and b is first in list 1: same score, so list 0 wins.
    expect(ids([["a"], ["b"]])).toEqual(["a", "b"])
  })

  it("counts an id repeated inside one list once, at its first place", () => {
    const [item] = reciprocalRankFusion([["a", "b", "a"]])

    expect(item.score).toBeCloseTo(1 / 61)
  })

  it("is empty for no lists and for empty lists", () => {
    expect(reciprocalRankFusion([])).toEqual([])
    expect(reciprocalRankFusion([[], []])).toEqual([])
  })

  it("takes a different constant", () => {
    expect(reciprocalRankFusion([["a"]], 10)[0].score).toBeCloseTo(1 / 11)
  })

  it("only the order matters, not how many items a list has before", () => {
    const keyword = ["k1", "k2", "both"]
    const vector = ["v1", "both", "v2"]

    expect(ids([keyword, vector])[0]).toBe("both")
  })
})
