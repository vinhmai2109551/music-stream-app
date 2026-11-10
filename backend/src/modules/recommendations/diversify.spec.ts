import { describe, expect, it } from "@jest/globals"
import { capPerArtist, MAX_PER_ARTIST, selectDiverse, type Candidate } from "./diversify.js"

const candidate = (
  id: string,
  artistId: string,
  relevance: number,
  vector: number[],
): Candidate => ({ id, artistId, relevance, vector })

describe("selectDiverse", () => {
  it("returns nothing for nothing and for a limit of 0", () => {
    expect(selectDiverse([], { limit: 5 })).toEqual([])
    expect(selectDiverse([candidate("a", "1", 1, [1, 0])], { limit: 0 })).toEqual([])
  })

  it("starts with the most relevant", () => {
    const picked = selectDiverse(
      [candidate("low", "1", 0.2, [1, 0]), candidate("high", "2", 0.9, [0, 1])],
      { limit: 2 },
    )
    expect(picked.map((c) => c.id)).toEqual(["high", "low"])
  })

  it("prefers a different song to a copy of the one already chosen", () => {
    const picked = selectDiverse(
      [
        candidate("best", "1", 0.9, [1, 0]),
        candidate("copy", "2", 0.85, [1, 0]),
        candidate("other", "3", 0.75, [0, 1]),
      ],
      { limit: 2 },
    )
    expect(picked.map((c) => c.id)).toEqual(["best", "other"])
  })

  it("is plain relevance order when lambda is 1", () => {
    const picked = selectDiverse(
      [
        candidate("best", "1", 0.9, [1, 0]),
        candidate("copy", "2", 0.85, [1, 0]),
        candidate("other", "3", 0.75, [0, 1]),
      ],
      { limit: 3, lambda: 1 },
    )
    expect(picked.map((c) => c.id)).toEqual(["best", "copy", "other"])
  })

  it("gives one artist at most three places by default", () => {
    const many = Array.from({ length: 6 }, (_, index) =>
      candidate(`a${index}`, "same", 0.9 - index * 0.01, [1, index]),
    )
    const picked = selectDiverse([...many, candidate("b", "other", 0.1, [0, 1])], { limit: 10 })

    expect(picked.filter((c) => c.artistId === "same")).toHaveLength(MAX_PER_ARTIST)
    expect(picked.map((c) => c.id)).toContain("b")
  })

  it("stops early when only full artists are left", () => {
    const picked = selectDiverse(
      Array.from({ length: 5 }, (_, index) => candidate(`a${index}`, "same", 0.5, [1, index])),
      { limit: 5, maxPerArtist: 2 },
    )
    expect(picked).toHaveLength(2)
  })

  it("never returns more than the limit or the same candidate twice", () => {
    const pool = Array.from({ length: 30 }, (_, index) =>
      candidate(`c${index}`, `artist${index % 7}`, 1 - index / 40, [
        Math.cos(index),
        Math.sin(index),
      ]),
    )
    const picked = selectDiverse(pool, { limit: 8 })

    expect(picked).toHaveLength(8)
    expect(new Set(picked.map((c) => c.id)).size).toBe(8)
  })

  it("gives the same list for the same input and does not change its input", () => {
    const pool = [
      candidate("a", "1", 0.5, [1, 0]),
      candidate("b", "2", 0.5, [1, 0]),
      candidate("c", "3", 0.5, [1, 0]),
    ]
    const copy = [...pool]

    expect(selectDiverse(pool, { limit: 3 })).toEqual(selectDiverse(pool, { limit: 3 }))
    expect(pool).toEqual(copy)
  })
})

describe("capPerArtist", () => {
  it("keeps the order and drops the artist's 4th track onward", () => {
    const items = ["a1", "a2", "b1", "a3", "a4", "b2"].map((id) => ({
      id,
      artistId: id[0],
    }))
    expect(capPerArtist(items).map((item) => item.id)).toEqual(["a1", "a2", "b1", "a3", "b2"])
  })

  it("takes another cap", () => {
    const items = [{ artistId: "a" }, { artistId: "a" }, { artistId: "b" }]
    expect(capPerArtist(items, 1)).toHaveLength(2)
  })
})
