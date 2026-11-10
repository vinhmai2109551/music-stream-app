import { describe, expect, it } from "vitest"
import { moveItem, removeAt } from "./list"

describe("moveItem", () => {
  it("moves an item up and down", () => {
    expect(moveItem(["a", "b", "c"], 1, -1)).toEqual(["b", "a", "c"])
    expect(moveItem(["a", "b", "c"], 1, 1)).toEqual(["a", "c", "b"])
  })

  it("keeps an item that cannot move further at the end of the list", () => {
    expect(moveItem(["a", "b", "c"], 0, -1)).toEqual(["a", "b", "c"])
    expect(moveItem(["a", "b", "c"], 2, 1)).toEqual(["a", "b", "c"])
  })

  it("does not change the list it was given", () => {
    const items = ["a", "b"]
    moveItem(items, 0, 1)
    expect(items).toEqual(["a", "b"])
  })

  it("ignores an index outside the list", () => {
    expect(moveItem(["a"], 5, 1)).toEqual(["a"])
    expect(moveItem([], 0, 1)).toEqual([])
  })
})

describe("removeAt", () => {
  it("drops one item", () => {
    expect(removeAt(["a", "b", "c"], 1)).toEqual(["a", "c"])
    expect(removeAt(["a"], 3)).toEqual(["a"])
  })
})
