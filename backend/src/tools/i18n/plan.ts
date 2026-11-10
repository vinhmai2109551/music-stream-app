import type { FlatTexts } from "./flatten.js"
import { fingerprint, hasNothingToTranslate, protect } from "./placeholders.js"

/** In the lock file, a text that a person wrote by hand (an override) instead of a machine. */
export const OVERRIDE_MARK = "override"

/** What each text of a language was made from: key -> fingerprint of the source (or OVERRIDE_MARK). */
export type LockEntries = Record<string, string>

/** The committed record of which source each translation was made from. */
export interface LockFile {
  version: 1
  sourceLanguage: string
  languages: Record<string, LockEntries>
}

export interface ToTranslate {
  key: string
  /** The Vietnamese text. */
  source: string
  /** The text as DeepL gets it, with placeholders and brand names wrapped in tags. */
  protectedText: string
  /** True when the language already has an older translation of this key. */
  stale: boolean
}

export interface LanguagePlan {
  /** Everything the language's file will hold once nothing is left to translate. */
  texts: FlatTexts
  lock: LockEntries
  toTranslate: ToTranslate[]
  /** Texts the language gets from its override file. */
  overridden: string[]
  /** Override keys that no source text matches (a typo, or a text that was removed). */
  unknownOverrides: string[]
}

export interface PlanInput {
  source: FlatTexts
  existing: FlatTexts
  lock: LockEntries
  overrides: FlatTexts
  keepTerms: readonly string[]
}

const PLURAL_SUFFIX = /_(?:zero|one|two|few|many|other)$/

/** "a.b_one" -> "a.b": the key a plural form belongs to. */
const baseKey = (key: string): string => key.replace(PLURAL_SUFFIX, "")

/**
 * Works out, for one language, what to keep, what a person wrote and what is left to translate.
 * A text is translated again only when it is new or its source (or a brand name in it) changed.
 */
export function planLanguage(input: PlanInput): LanguagePlan {
  const { source, existing, lock, overrides, keepTerms } = input
  const plan: LanguagePlan = {
    texts: {},
    lock: {},
    toTranslate: [],
    overridden: [],
    unknownOverrides: [],
  }

  for (const [key, text] of Object.entries(source)) {
    const override = overrides[key]
    if (override !== undefined) {
      plan.texts[key] = override
      plan.lock[key] = OVERRIDE_MARK
      plan.overridden.push(key)
      continue
    }
    const wanted = fingerprint(text, keepTerms)
    const protectedText = protect(text, keepTerms)
    // Only brand names, numbers and placeholders: it reads the same in every language.
    if (hasNothingToTranslate(protectedText)) {
      plan.texts[key] = text
      plan.lock[key] = wanted
      continue
    }
    if (lock[key] === wanted && existing[key] !== undefined) {
      plan.texts[key] = existing[key]
      plan.lock[key] = wanted
      continue
    }
    plan.toTranslate.push({ key, source: text, protectedText, stale: existing[key] !== undefined })
  }

  // Plural forms and other texts only an override has: kept when they belong to a source text.
  for (const [key, text] of Object.entries(overrides)) {
    if (key in source) continue
    if (baseKey(key) in source) {
      plan.texts[key] = text
      plan.overridden.push(key)
    } else {
      plan.unknownOverrides.push(key)
    }
  }
  return plan
}

/** Characters DeepL is expected to bill for a plan (the tags are not billed, so this is an upper bound). */
export function expectedCharacters(items: readonly ToTranslate[]): number {
  const distinct = new Set(items.map((item) => item.protectedText))
  let total = 0
  for (const text of distinct) total += text.length
  return total
}
