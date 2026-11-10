/**
 * DeepL refuses a request over 128 KiB. The SDK sends the texts as a form (`text=...&text=...`), so
 * a character outside ASCII counts for 6 to 9 bytes once it is percent-encoded: a Korean song of
 * 2 000 characters is about 18 KB. The size of a batch is therefore measured as it is sent, and
 * kept well under the limit.
 */
export const MAX_BATCH_BYTES = 100 * 1024
/** Texts in one request. The current documentation gives no number; 50 was the documented limit. */
export const MAX_BATCH_TEXTS = 50

/** Bytes the form needs for the field name and the separator of one text (`&text=`). */
const FIELD_OVERHEAD = 6

export interface BatchLimits {
  maxTexts: number
  maxBytes: number
}

export const DEFAULT_BATCH_LIMITS: BatchLimits = {
  maxTexts: MAX_BATCH_TEXTS,
  maxBytes: MAX_BATCH_BYTES,
}

/** How many bytes `text` takes in the body of a request. */
export const requestBytes = (text: string): number =>
  encodeURIComponent(text).length + FIELD_OVERHEAD

/** A single text that cannot be sent in any request. */
export class TextTooLargeError extends Error {
  constructor(
    readonly index: number,
    readonly bytes: number,
    readonly maxBytes: number,
  ) {
    super(`The text at position ${index} is too large to translate in one request`)
  }
}

/**
 * Cuts a list into requests, in order: each holds at most `maxTexts` texts and `maxBytes` bytes.
 * The result lists the positions (not the texts) of each request. A text that alone is over the
 * limit throws before anything is sent, so a request that cannot succeed costs nothing.
 */
export function planBatches(
  texts: readonly string[],
  limits: BatchLimits = DEFAULT_BATCH_LIMITS,
): number[][] {
  const batches: number[][] = []
  let current: number[] = []
  let currentBytes = 0

  texts.forEach((text, index) => {
    const bytes = requestBytes(text)
    if (bytes > limits.maxBytes) throw new TextTooLargeError(index, bytes, limits.maxBytes)
    const full = current.length >= limits.maxTexts || currentBytes + bytes > limits.maxBytes
    if (current.length > 0 && full) {
      batches.push(current)
      current = []
      currentBytes = 0
    }
    current.push(index)
    currentBytes += bytes
  })
  if (current.length > 0) batches.push(current)
  return batches
}
