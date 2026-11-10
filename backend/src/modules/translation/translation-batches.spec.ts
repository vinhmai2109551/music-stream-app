import { describe, expect, it } from "@jest/globals"
import {
  MAX_BATCH_BYTES,
  MAX_BATCH_TEXTS,
  planBatches,
  requestBytes,
  TextTooLargeError,
} from "./translation-batches.js"

const limits = { maxTexts: 3, maxBytes: 100 }

describe("requestBytes", () => {
  it("counts a text as it is written in the form that is sent", () => {
    expect(requestBytes("abc")).toBe(3 + 6)
    expect(requestBytes("a b")).toBe("a%20b".length + 6)
  })

  it("counts a character outside ASCII as 6 to 9 bytes", () => {
    expect(requestBytes("á")).toBe(6 + 6) // 2 UTF-8 bytes
    expect(requestBytes("한")).toBe(9 + 6) // 3 UTF-8 bytes
    expect(requestBytes("😀")).toBe(12 + 6) // 4 UTF-8 bytes
  })
})

describe("planBatches", () => {
  it("gives nothing for nothing", () => {
    expect(planBatches([])).toEqual([])
  })

  it("keeps everything in one request when it fits", () => {
    expect(planBatches(["a", "b", "c"])).toEqual([[0, 1, 2]])
  })

  it("cuts after the most texts a request may hold, keeping the order", () => {
    expect(planBatches(["a", "b", "c", "d", "e", "f", "g"], limits)).toEqual([
      [0, 1, 2],
      [3, 4, 5],
      [6],
    ])
  })

  it("uses 50 texts and 100 KiB unless told otherwise", () => {
    expect(MAX_BATCH_TEXTS).toBe(50)
    expect(MAX_BATCH_BYTES).toBe(100 * 1024)
    const texts = Array.from({ length: 120 }, (_, index) => `line ${index}`)
    const batches = planBatches(texts)
    expect(batches.map((batch) => batch.length)).toEqual([50, 50, 20])
    expect(batches.flat()).toEqual(texts.map((_, index) => index))
  })

  it("cuts when the next text would take a request over the size limit", () => {
    const text = "x".repeat(40) // 46 bytes each: two fit in 100, three do not
    expect(planBatches([text, text, text, text], { maxTexts: 50, maxBytes: 100 })).toEqual([
      [0, 1],
      [2, 3],
    ])
  })

  it("lets a request take exactly the size limit", () => {
    const text = "x".repeat(44) // 50 bytes each
    expect(planBatches([text, text], { maxTexts: 50, maxBytes: 100 })).toEqual([[0, 1]])
  })

  it("measures non-ASCII text as it is sent, not by its characters", () => {
    const korean = "한".repeat(4) // 36 + 6 = 42 bytes, though only 4 characters
    expect(planBatches([korean, korean, korean], { maxTexts: 50, maxBytes: 100 })).toEqual([
      [0, 1],
      [2],
    ])
  })

  it("puts a text that is the limit by itself in its own request", () => {
    const big = "x".repeat(94) // 100 bytes
    expect(planBatches(["a", big, "b"], { maxTexts: 50, maxBytes: 100 })).toEqual([[0], [1], [2]])
  })

  it("refuses a text that can never fit, before anything is sent, and says where it is", () => {
    const tooBig = "x".repeat(95) // 101 bytes
    try {
      planBatches(["ok", "ok", tooBig], { maxTexts: 50, maxBytes: 100 })
      throw new Error("should have thrown")
    } catch (error) {
      expect(error).toBeInstanceOf(TextTooLargeError)
      expect((error as TextTooLargeError).index).toBe(2)
      expect((error as TextTooLargeError).bytes).toBe(101)
      expect((error as Error).message).not.toContain("xxxx") // the text is not in the message
    }
  })
})
