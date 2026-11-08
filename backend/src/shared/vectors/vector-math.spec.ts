import { describe, expect, it } from "@jest/globals"
import { cosineSimilarity, normalize, parseVector, toVectorParam } from "./vector-math.js"

describe("normalize", () => {
  it("scales a vector to length 1", () => {
    expect(normalize([3, 4])).toEqual([0.6, 0.8])
  })

  it("leaves a zero vector alone instead of dividing by zero", () => {
    expect(normalize([0, 0, 0])).toEqual([0, 0, 0])
  })

  it("does not change its input", () => {
    const input = [3, 4]
    normalize(input)
    expect(input).toEqual([3, 4])
  })
})

describe("cosineSimilarity", () => {
  it("is 1 for the same direction, 0 for a right angle and -1 for opposite ones", () => {
    expect(cosineSimilarity([1, 2], [2, 4])).toBeCloseTo(1)
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0)
    expect(cosineSimilarity([1, 2], [-1, -2])).toBeCloseTo(-1)
  })

  it("does not depend on the length of the vectors", () => {
    expect(cosineSimilarity([1, 1], [100, 1])).toBeCloseTo(cosineSimilarity([5, 5], [1, 0.01]))
  })

  it("is 0 when a vector is all zeros", () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0)
  })

  it("refuses vectors of different lengths", () => {
    expect(() => cosineSimilarity([1], [1, 2])).toThrow(/different lengths/)
  })
})

describe("toVectorParam", () => {
  it("writes the text form pgvector reads", () => {
    expect(toVectorParam([0.1, -2, 3], 3)).toBe("[0.1,-2,3]")
  })

  it("keeps very small and very large numbers readable by pgvector", () => {
    expect(toVectorParam([1e-7, 1.5e21], 2)).toBe("[1e-7,1.5e+21]")
  })

  it("refuses a vector of the wrong length", () => {
    expect(() => toVectorParam([1, 2], 3)).toThrow(/Expected a vector of 3/)
    expect(() => toVectorParam([], 1)).toThrow(/got 0/)
  })

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "refuses %s",
    (value) => {
      expect(() => toVectorParam([1, value], 2)).toThrow(/finite/)
    },
  )

  it("can only ever write numbers, so there is nothing to inject", () => {
    const hostile = ["1); DROP TABLE x; --" as unknown as number, 2]
    expect(() => toVectorParam(hostile, 2)).toThrow(/finite/)
  })
})

describe("parseVector", () => {
  it("reads what toVectorParam wrote", () => {
    const values = [0.25, -1, 3e-7, 42]
    expect(parseVector(toVectorParam(values, 4))).toEqual(values)
  })

  it("reads an empty vector and ignores spaces", () => {
    expect(parseVector("[]")).toEqual([])
    expect(parseVector(" [ 1, 2 ] ")).toEqual([1, 2])
  })

  it.each(["", "1,2", "[1,2", "[1,x]", "[1,,2]", "(1,2)"])("refuses %j", (text) => {
    expect(() => parseVector(text)).toThrow(/Not a vector/)
  })
})
