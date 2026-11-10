import { describe, expect, it } from "vitest"
import { parseLrc, toLrc } from "./lrc"

describe("parseLrc", () => {
  it("reads lines and their start times", () => {
    const result = parseLrc("[00:12.00]Một\n[00:15.50]Hai\n[01:02.05]Ba")

    expect(result.lines).toEqual(["Một", "Hai", "Ba"])
    expect(result.timingsMs).toEqual([12000, 15500, 62050])
  })

  it("accepts tags with one, two or three digits after the dot, and a colon as the separator", () => {
    const result = parseLrc("[00:01.5]a\n[00:02.50]b\n[00:03.500]c\n[00:04:25]d\n[00:05]e")

    expect(result.timingsMs).toEqual([1500, 2500, 3500, 4250, 5000])
  })

  it("keeps a timed blank line as a blank line", () => {
    const result = parseLrc("[00:10.00]Một\n[00:20.00]\n[00:25.00]Hai")

    expect(result.lines).toEqual(["Một", "", "Hai"])
    expect(result.timingsMs).toEqual([10000, 20000, 25000])
  })

  it("makes a line for every tag of a line with several (a repeated chorus) and sorts by time", () => {
    const result = parseLrc("[00:30.00][01:10.00]Điệp khúc\n[00:10.00]Lời một")

    expect(result.lines).toEqual(["Lời một", "Điệp khúc", "Điệp khúc"])
    expect(result.timingsMs).toEqual([10000, 30000, 70000])
  })

  it("ignores the information tags and applies the offset", () => {
    const result = parseLrc(
      "[ti:Bài hát]\n[ar:Nghệ sĩ]\n[offset:+500]\n[00:10.00]Một\n[00:20.00]Hai",
    )

    expect(result.lines).toEqual(["Một", "Hai"])
    expect(result.timingsMs).toEqual([10500, 20500])
  })

  it("does not let a negative offset go below zero", () => {
    const result = parseLrc("[offset:-5000]\n[00:03.00]Một\n[00:20.00]Hai")

    expect(result.timingsMs).toEqual([0, 15000])
  })

  it("drops the word tags of enhanced LRC", () => {
    const result = parseLrc("[00:10.00]<00:10.00>Xin <00:10.50>chào")

    expect(result.lines).toEqual(["Xin chào"])
  })

  it("reads Windows line breaks and a byte order mark", () => {
    const result = parseLrc("﻿[00:01.00]a\r\n[00:02.00]b\r\n")

    expect(result.lines).toEqual(["a", "b", ""])
    expect(result.timingsMs).toEqual([1000, 2000, 2000])
  })

  it("gives plain lines and no timings for a file without time tags", () => {
    const result = parseLrc("Một\n\nHai")

    expect(result.lines).toEqual(["Một", "", "Hai"])
    expect(result.timingsMs).toBeNull()
  })

  it("gives a line without a tag in a timed file the time of the line before it", () => {
    const result = parseLrc("[00:10.00]Một\nHai\n[00:20.00]Ba")

    expect(result.lines).toEqual(["Một", "Hai", "Ba"])
    expect(result.timingsMs).toEqual([10000, 10000, 20000])
  })

  it("gives an empty file one blank line and no timings", () => {
    expect(parseLrc("")).toEqual({ lines: [""], timingsMs: null })
  })
})

describe("toLrc", () => {
  it("writes a tag in front of every line", () => {
    expect(toLrc(["Một", "", "Hai"], [10000, 20000, 25500])).toBe(
      "[00:10.00]Một\n[00:20.00]\n[00:25.50]Hai",
    )
  })

  it("writes plain lines without timings", () => {
    expect(toLrc(["Một", "Hai"], null)).toBe("Một\nHai")
  })

  it("writes plain lines when the timings do not fit the lines", () => {
    expect(toLrc(["Một", "Hai"], [1000])).toBe("Một\nHai")
  })

  it("can be read back by parseLrc", () => {
    const lines = ["Một", "", "Hai", "Ba"]
    const timings = [1230, 5000, 5000, 9990]

    expect(parseLrc(toLrc(lines, timings))).toEqual({ lines, timingsMs: timings })
  })
})
