/** Turns the bytes of a stream into text, however the bytes are cut into pieces. */
export interface Utf8Decoder {
  /** The text of the bytes so far; a character cut in the middle waits for the rest. */
  decode(bytes: Uint8Array): string
  /** The stream ended: what is left (a broken character becomes "�"). */
  end(): string
}

const REPLACEMENT = "�"

/** How many bytes a character that starts with `first` has, or 0 when `first` cannot start one. */
function lengthOf(first: number): number {
  if (first < 0x80) return 1
  if (first >= 0xc2 && first <= 0xdf) return 2
  if (first >= 0xe0 && first <= 0xef) return 3
  if (first >= 0xf0 && first <= 0xf4) return 4
  return 0
}

/** A UTF-8 decoder written out, for engines that have no `TextDecoder`. */
function manualDecoder(): Utf8Decoder {
  let carry: number[] = []

  const decodeAll = (bytes: number[], final: boolean): string => {
    let text = ""
    let index = 0
    while (index < bytes.length) {
      const first = bytes[index]
      const length = lengthOf(first)
      if (length === 0) {
        text += REPLACEMENT
        index += 1
        continue
      }
      if (index + length > bytes.length) {
        // The character is cut: keep it for the next piece, or give up on it at the end.
        if (!final) {
          carry = bytes.slice(index)
          return text
        }
        text += REPLACEMENT
        break
      }
      if (length === 1) {
        text += String.fromCharCode(first)
        index += 1
        continue
      }
      const rest = bytes.slice(index + 1, index + length)
      if (rest.some((byte) => (byte & 0xc0) !== 0x80)) {
        text += REPLACEMENT
        index += 1
        continue
      }
      let code = first & (0xff >> (length + 1))
      for (const byte of rest) code = (code << 6) | (byte & 0x3f)
      const overlong = (length === 3 && code < 0x800) || (length === 4 && code < 0x10000)
      const surrogate = code >= 0xd800 && code <= 0xdfff
      text += overlong || surrogate || code > 0x10ffff ? REPLACEMENT : String.fromCodePoint(code)
      index += length
    }
    carry = []
    return text
  }

  return {
    decode(bytes) {
      const all = [...carry, ...bytes]
      carry = []
      return decodeAll(all, false)
    },
    end() {
      const all = carry
      carry = []
      return decodeAll(all, true)
    },
  }
}

/** The platform's decoder when there is one, else the one written out above. */
export function createUtf8Decoder(): Utf8Decoder {
  if (typeof TextDecoder === "function") {
    const decoder = new TextDecoder("utf-8")
    return {
      decode: (bytes) => decoder.decode(bytes, { stream: true }),
      end: () => decoder.decode(),
    }
  }
  return manualDecoder()
}

/** Exposed for the tests: the decoder that needs no `TextDecoder`. */
export const createManualUtf8Decoder = manualDecoder
