import { describe, expect, it } from "@jest/globals"
import type { ApiCommentPage } from "@/api/types"
import {
  removedFromThread,
  removedWeight,
  startOverlay,
  withoutRemoved,
  type Removals,
} from "@/utils/commentThreads"

const removed: Removals = {
  root: { threadId: null, weight: 4 },
  r1: { threadId: "t1", weight: 1 },
  r2: { threadId: "t1", weight: 1 },
  r3: { threadId: "t2", weight: 1 },
}

describe("withoutRemoved", () => {
  it("drops the deleted items and keeps the order of the others", () => {
    const items = [{ id: "a" }, { id: "r1" }, { id: "b" }, { id: "root" }, { id: "c" }]

    expect(withoutRemoved(items, removed)).toEqual([{ id: "a" }, { id: "b" }, { id: "c" }])
  })

  it("returns everything when nothing was deleted", () => {
    const items = [{ id: "a" }, { id: "b" }]

    expect(withoutRemoved(items, {})).toEqual(items)
  })
})

describe("removedFromThread", () => {
  it("counts the replies deleted from one thread only", () => {
    expect(removedFromThread(removed, "t1")).toBe(2)
    expect(removedFromThread(removed, "t2")).toBe(1)
    expect(removedFromThread(removed, "other")).toBe(0)
  })

  it("does not count a deleted top-level comment as a reply", () => {
    expect(removedFromThread({ root: removed.root }, "root")).toBe(0)
  })
})

describe("removedWeight", () => {
  it("adds up every comment the deletions took away", () => {
    expect(removedWeight(removed)).toBe(7)
    expect(removedWeight({})).toBe(0)
  })
})

describe("startOverlay", () => {
  it("starts empty on top of a first page and continues where that page ended", () => {
    const page = { items: [], nextCursor: "next", total: 0 } as ApiCommentPage

    expect(startOverlay(page)).toMatchObject({
      base: page,
      nextCursor: "next",
      later: [],
      written: [],
      replies: {},
      writtenReplies: {},
      removed: {},
    })
    expect(startOverlay(page).exhausted.size).toBe(0)
  })
})
