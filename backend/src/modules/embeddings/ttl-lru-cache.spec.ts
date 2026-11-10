import { describe, expect, it } from "@jest/globals"
import { TtlLruCache } from "./ttl-lru-cache.js"

function clock(start = 1000) {
  let now = start
  return { now: () => now, advance: (ms: number) => (now += ms) }
}

describe("TtlLruCache", () => {
  it("returns what was stored, and undefined for the rest", () => {
    const cache = new TtlLruCache<string, number>(5, 1000)
    cache.set("a", 1)

    expect(cache.get("a")).toBe(1)
    expect(cache.get("b")).toBeUndefined()
  })

  it("forgets an entry once its time to live has passed", () => {
    const time = clock()
    const cache = new TtlLruCache<string, number>(5, 1000, time.now)
    cache.set("a", 1)

    time.advance(999)
    expect(cache.get("a")).toBe(1)
    time.advance(1)
    expect(cache.get("a")).toBeUndefined()
    expect(cache.size).toBe(0)
  })

  it("does not extend the life of an entry that is only read", () => {
    const time = clock()
    const cache = new TtlLruCache<string, number>(5, 1000, time.now)
    cache.set("a", 1)

    time.advance(600)
    cache.get("a")
    time.advance(600)

    expect(cache.get("a")).toBeUndefined()
  })

  it("starts the time to live again when an entry is set again", () => {
    const time = clock()
    const cache = new TtlLruCache<string, number>(5, 1000, time.now)
    cache.set("a", 1)
    time.advance(900)
    cache.set("a", 2)
    time.advance(900)

    expect(cache.get("a")).toBe(2)
  })

  it("drops the least recently used entry when it is full", () => {
    const cache = new TtlLruCache<string, number>(2, 1000)
    cache.set("a", 1)
    cache.set("b", 2)
    cache.set("c", 3)

    expect(cache.get("a")).toBeUndefined()
    expect(cache.get("b")).toBe(2)
    expect(cache.get("c")).toBe(3)
    expect(cache.size).toBe(2)
  })

  it("counts a read as a use, so a read entry outlives an unread one", () => {
    const cache = new TtlLruCache<string, number>(2, 1000)
    cache.set("a", 1)
    cache.set("b", 2)
    cache.get("a")
    cache.set("c", 3)

    expect(cache.get("b")).toBeUndefined()
    expect(cache.get("a")).toBe(1)
  })

  it("does not grow when the same key is set again and again", () => {
    const cache = new TtlLruCache<string, number>(2, 1000)
    for (let index = 0; index < 10; index += 1) cache.set("a", index)

    expect(cache.size).toBe(1)
    expect(cache.get("a")).toBe(9)
  })
})
