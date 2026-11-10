/** What the service needs from a translation engine. DeepL is one implementation; tests use another. */
export const TRANSLATOR = Symbol("TRANSLATOR")

export interface TranslatorRequest {
  /** DeepL code of the language of the texts, or null to let the engine detect it. */
  source: string | null
  /** DeepL code of the language to translate to. */
  target: string
  /** `xml`: the texts hold tags (placeholders) that must come back unchanged and in place. */
  tagHandling?: "xml"
  /** With `xml`: the tags whose content must not be translated. */
  ignoreTags?: string[]
}

export interface TranslatedText {
  text: string
  /** Characters DeepL counted for this text: what it takes from the monthly allowance. */
  billedCharacters: number
}

export interface TranslatorUsage {
  used: number
  limit: number
}

export interface Translator {
  /** The translations, one per text and in the same order. */
  translate(texts: string[], request: TranslatorRequest): Promise<TranslatedText[]>
  /** How much of the allowance of the billing period is used. */
  usage(): Promise<TranslatorUsage>
}

/**
 * Why the engine could not translate:
 * - `auth`: it refused the key (a setting is wrong; nothing a retry can fix).
 * - `quota`: the allowance of the period is used up (never retried).
 * - `rate-limited` and `unavailable`: busy or down, after the engine's own retries.
 * - `bad-request`: it did not accept the texts or the options.
 */
export type TranslatorFailureKind =
  "auth" | "quota" | "rate-limited" | "unavailable" | "bad-request"

export class TranslatorFailure extends Error {
  constructor(
    readonly kind: TranslatorFailureKind,
    readonly httpStatus?: number,
  ) {
    // No text of the request or of the answer goes in a message: lyrics must not reach a log.
    super(`Translation failed: ${kind}${httpStatus ? ` (HTTP ${httpStatus})` : ""}`)
  }
}
