import {
  DESCRIPTION_MAX_LENGTH,
  LANGUAGE_CODE,
  LIST_ITEM_MAX_LENGTH,
} from "../../shared/validation/limits.js"
import type { ArtistMetadata, TrackMetadata } from "../catalog/metadata.js"

/** What the model returns for a song, before it is checked. */
export interface RawTrackSuggestion {
  id?: unknown
  genres?: unknown
  mood?: unknown
  tags?: unknown
  description?: unknown
  language?: unknown
  confidence?: unknown
}

export type Confidence = "high" | "medium" | "low"

export interface TrackSuggestion {
  metadata: TrackMetadata
  confidence: Confidence
  /** The description looked like it quoted lyrics, so it was dropped; a person should write one. */
  descriptionDropped: boolean
}

/** More than this many words between quotation marks reads like a quoted lyric, not a title. */
const QUOTED_WORDS_LIMIT = 5

const CAPS = { genres: 5, mood: 5, tags: 8 } as const

/** A list the way the database wants it: trimmed words, no blanks, no repeats, short, few. */
export function cleanList(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const result: string[] = []
  for (const entry of value) {
    if (typeof entry !== "string") continue
    const word = entry.trim().replace(/\s+/g, " ")
    const key = word.toLowerCase()
    if (!word || word.length > LIST_ITEM_MAX_LENGTH || seen.has(key)) continue
    seen.add(key)
    result.push(word)
    if (result.length === max) break
  }
  return result
}

/** True when a text has a passage of more than a few words in quotation marks - a possible lyric. */
export function quotesLongPassage(text: string): boolean {
  const quoted = /["“”«»‘’]([^"“”«»‘’]+)["“”«»‘’]/g
  for (const match of text.matchAll(quoted)) {
    if (match[1].trim().split(/\s+/).length > QUOTED_WORDS_LIMIT) return true
  }
  return false
}

function cleanDescription(value: unknown): { text: string; dropped: boolean } {
  if (typeof value !== "string") return { text: "", dropped: false }
  const text = value.trim().replace(/\s+/g, " ")
  if (quotesLongPassage(text)) return { text: "", dropped: true }
  if (text.length <= DESCRIPTION_MAX_LENGTH) return { text, dropped: false }
  // Cut at a word, not in the middle of one.
  return { text: text.slice(0, DESCRIPTION_MAX_LENGTH).replace(/\s+\S*$/, ""), dropped: false }
}

function cleanLanguage(value: unknown): string | null {
  if (typeof value !== "string") return null
  const code = value.trim().toLowerCase()
  return LANGUAGE_CODE.test(code) ? code : null
}

function cleanConfidence(value: unknown): Confidence {
  return value === "high" || value === "medium" ? value : "low"
}

/** Turns one entry the model returned into metadata that passes the same limits as the admin API. */
export function toTrackSuggestion(raw: RawTrackSuggestion): TrackSuggestion {
  const description = cleanDescription(raw.description)
  return {
    metadata: {
      genres: cleanList(raw.genres, CAPS.genres),
      mood: cleanList(raw.mood, CAPS.mood),
      tags: cleanList(raw.tags, CAPS.tags),
      description: description.text,
      language: cleanLanguage(raw.language),
    },
    confidence: cleanConfidence(raw.confidence),
    descriptionDropped: description.dropped,
  }
}

export function toArtistMetadata(raw: { genres?: unknown }): ArtistMetadata {
  return { genres: cleanList(raw.genres, CAPS.genres) }
}
