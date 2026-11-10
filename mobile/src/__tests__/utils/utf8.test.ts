import { describe, expect, it } from "@jest/globals"
import { createManualUtf8Decoder, createUtf8Decoder, type Utf8Decoder } from "@/utils/utf8"

const encode = (text: string) => new TextEncoder().encode(text)

/** The text of `bytes` cut into pieces at `cuts`. */
function decodeCut(make: () => Utf8Decoder, bytes: Uint8Array, cuts: number[]): string {
  const decoder = make()
  const edges = [0, ...cuts, bytes.length]
  let text = ""
  for (let index = 0; index < edges.length - 1; index += 1) {
    text += decoder.decode(bytes.slice(edges[index], edges[index + 1]))
  }
  return text + decoder.end()
}

const SAMPLE = "Xin chào Hà Nội ♪ 音楽 🎵 ok"

describe.each([
  ["the platform decoder", createUtf8Decoder],
  ["the decoder written out", createManualUtf8Decoder],
])("%s", (_name, make) => {
  it("decodes plain text and Vietnamese", () => {
    expect(decodeCut(make, encode("Sơn Tùng M-TP"), [])).toBe("Sơn Tùng M-TP")
  })

  it("decodes 1, 2, 3 and 4-byte characters", () => {
    expect(decodeCut(make, encode(SAMPLE), [])).toBe(SAMPLE)
  })

  it("gives the same text however the bytes are cut, even inside a character", () => {
    const bytes = encode(SAMPLE)
    for (let cut = 1; cut < bytes.length; cut += 1) {
      expect(decodeCut(make, bytes, [cut])).toBe(SAMPLE)
    }
  })

  it("gives the same text one byte at a time", () => {
    const bytes = encode(SAMPLE)
    expect(decodeCut(make, bytes, [...bytes.keys()].slice(1))).toBe(SAMPLE)
  })

  it("gives nothing for no bytes", () => {
    expect(decodeCut(make, new Uint8Array(), [])).toBe("")
  })

  it("waits for the rest of a character instead of giving a broken one", () => {
    const decoder = make()
    const bytes = encode("🎵")
    expect(decoder.decode(bytes.slice(0, 2))).toBe("")
    expect(decoder.decode(bytes.slice(2))).toBe("🎵")
    expect(decoder.end()).toBe("")
  })

  it("turns a character that never finishes into one replacement character at the end", () => {
    const decoder = make()
    expect(decoder.decode(encode("a€").slice(0, 2))).toBe("a")
    expect(decoder.end()).toBe("�")
  })
})

describe("the decoder written out, for what is not valid UTF-8", () => {
  it.each([
    ["a stray continuation byte", [0x61, 0x80, 0x62], "a�b"],
    ["a lead byte that is never valid", [0xff, 0x61], "�a"],
    ["a lead byte followed by a plain letter", [0xe2, 0x82, 0x61], "��a"],
    ["an overlong slash", [0xc0, 0xaf], "��"],
    ["a surrogate encoded in 3 bytes", [0xed, 0xa0, 0x80], "�"],
    ["a code point above U+10FFFF", [0xf4, 0x90, 0x80, 0x80], "�"],
  ])("replaces %s", (_name, bytes, expected) => {
    const decoder = createManualUtf8Decoder()
    expect(decoder.decode(new Uint8Array(bytes)) + decoder.end()).toBe(expected)
  })
})
