import {
  EMBEDDING_DIMENSIONS,
  type EmbeddingKind,
  type EmbeddingProvider,
} from "./embedding-provider.js"
import { normalize } from "../../shared/vectors/vector-math.js"

/** Lower case without accents: "Sơn Tùng" and "son tung" become the same text. */
const fold = (text: string) =>
  text.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/gi, "d").toLowerCase()

/** FNV-1a, 32 bits: the same on every run and every machine. */
function hash(text: string): number {
  let value = 0x811c9dc5
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index)
    value = Math.imul(value, 0x01000193) >>> 0
  }
  return value
}

/**
 * A deterministic stand-in for a real model: it hashes the words and letter triples of a text
 * into a vector, so texts that share words end up close together. No network, no key. For tests
 * and offline development only (the settings refuse it in production). It knows nothing about
 * meaning: "sad" and "melancholy" are not related.
 */
export class HashingEmbeddingProvider implements EmbeddingProvider {
  readonly model = "hashing-v1"
  readonly dimensions = EMBEDDING_DIMENSIONS

  embed(texts: readonly string[], _kind: EmbeddingKind): Promise<number[][]> {
    return Promise.resolve(texts.map((text) => this.vectorOf(text)))
  }

  private vectorOf(text: string): number[] {
    const vector = new Array<number>(this.dimensions).fill(0)
    for (const word of fold(text)
      .split(/[^\p{L}\p{N}]+/u)
      .filter(Boolean)) {
      this.add(vector, `w:${word}`, 2)
      const padded = `^${word}$`
      for (let index = 0; index + 3 <= padded.length; index += 1) {
        this.add(vector, `t:${padded.slice(index, index + 3)}`, 1)
      }
    }
    return normalize(vector)
  }

  private add(vector: number[], feature: string, weight: number) {
    const code = hash(feature)
    vector[code % this.dimensions] += code & 0x80000000 ? -weight : weight
  }
}
