/** The vector scaled to length 1, so that cosine distance and inner product agree. */
export function normalize(values: readonly number[]): number[] {
  const length = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0))
  return length === 0 ? [...values] : values.map((value) => value / length)
}

/** Cosine similarity, from -1 to 1 (0 when either vector is all zeros). */
export function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length) throw new Error("Vectors of different lengths cannot be compared")
  let dot = 0
  let lengthA = 0
  let lengthB = 0
  for (let index = 0; index < a.length; index += 1) {
    dot += a[index] * b[index]
    lengthA += a[index] * a[index]
    lengthB += b[index] * b[index]
  }
  return lengthA === 0 || lengthB === 0 ? 0 : dot / Math.sqrt(lengthA * lengthB)
}

/**
 * The text form pgvector reads (`[0.1,0.2,...]`), to pass as a QUERY PARAMETER cast with
 * `::vector` - never to be pasted into the SQL text. Refuses anything that is not a finite number
 * and any length other than `dimensions`, so a wrong vector fails here and not inside the database.
 */
export function toVectorParam(values: readonly number[], dimensions: number): string {
  if (values.length !== dimensions) {
    throw new Error(`Expected a vector of ${dimensions} numbers, got ${values.length}`)
  }
  if (!values.every((value) => Number.isFinite(value))) {
    throw new Error("A vector can only hold finite numbers")
  }
  return `[${values.join(",")}]`
}

/** The inverse of `toVectorParam`: reads the text pgvector returns for a vector column. */
export function parseVector(text: string): number[] {
  const body = text.trim()
  if (!body.startsWith("[") || !body.endsWith("]")) throw new Error("Not a vector")
  const inner = body.slice(1, -1).trim()
  if (inner === "") return []
  return inner.split(",").map((part) => {
    const value = Number(part)
    if (part.trim() === "" || !Number.isFinite(value)) throw new Error("Not a vector")
    return value
  })
}
