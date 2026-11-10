/** Lyrics of a track as they are kept. */
export interface StoredLyrics {
  id: string
  trackId: string
  /** App language code of the lines. */
  language: string
  lines: string[]
  /** Start of each line in milliseconds; empty when there are no timings. */
  timingsMs: number[]
  source: string
  contentHash: string
  updatedAt: Date
}

export interface StoredTranslation {
  id: string
  lyricsId: string
  targetLanguage: string
  sourceHash: string
  lines: string[]
  provider: string
  billedCharacters: number
  createdAt: Date
}

export interface LyricsInput {
  trackId: string
  language: string
  lines: string[]
  timingsMs: number[]
  source: string
  contentHash: string
}

export interface TranslationInput {
  lyricsId: string
  targetLanguage: string
  sourceHash: string
  lines: string[]
  provider: string
  billedCharacters: number
}

/** Where the lyrics and their translations are kept. */
export interface LyricsStore {
  findLyrics(trackId: string): Promise<StoredLyrics | null>
  /** Which of these tracks have lyrics, and whether those lyrics are timed. Tracks without lyrics are left out. */
  findStatuses(trackIds: readonly string[]): Promise<{ trackId: string; timed: boolean }[]>
  upsertLyrics(input: LyricsInput): Promise<StoredLyrics>
  /** Removes the translations of the lyrics that were made from another version of the text. */
  deleteStaleTranslations(lyricsId: string, currentHash: string): Promise<void>
  findTranslation(
    lyricsId: string,
    targetLanguage: string,
    sourceHash: string,
  ): Promise<StoredTranslation | null>
  /**
   * Keeps a translation unless the same lyrics, language and version already has one (another
   * request got there first); either way, returns the one that is kept.
   */
  saveTranslation(input: TranslationInput): Promise<StoredTranslation>
}

export const LYRICS_STORE = Symbol("LYRICS_STORE")

/** What a source needs to look a song up. */
export interface LyricsLookup {
  trackId: string
  title: string
  artist: string
}

/** Lyrics a source found, in the shape the module keeps them. */
export interface SourcedLyrics {
  language: string
  lines: string[]
  timingsMs?: number[]
  /** Shown to people as where the text comes from. */
  source: string
}

/**
 * A place lyrics can be fetched from (a licensed provider). None is connected yet: `NullLyricsSource`
 * answers "not found" and lyrics are entered by an administrator. A provider is added by writing a
 * class that implements this interface and providing it as `LYRICS_SOURCE`.
 */
export interface LyricsSource {
  fetch(track: LyricsLookup): Promise<SourcedLyrics | null>
}

export const LYRICS_SOURCE = Symbol("LYRICS_SOURCE")

export class NullLyricsSource implements LyricsSource {
  fetch(): Promise<SourcedLyrics | null> {
    return Promise.resolve(null)
  }
}

/** What the module needs to know about a track: it must exist, and a source may look it up by name. */
export interface TrackDirectory {
  /** Resolves with the title and artist, or rejects with a 404 when there is no such track. */
  find(trackId: string): Promise<{ title: string; artist: string }>
}

export const TRACK_DIRECTORY = Symbol("TRACK_DIRECTORY")

/** The languages lyrics may be written in and translated to (the app languages). */
export const LYRICS_LANGUAGES = Symbol("LYRICS_LANGUAGES")

/** The translation engine, seen from the module. */
export interface LyricsTranslator {
  /** The app language code for `code`, or null when it is not one the app has. */
  parseLanguage(code: string): string | null
  /** Rejects (503) when this share of the monthly allowance or more is used. */
  assertUsageBelow(percent: number): Promise<void>
  /** One translation per line, in the same order; blank lines come back blank. */
  translate(
    lines: readonly string[],
    target: string,
    source: string,
  ): Promise<{ lines: string[]; billedCharacters: number }>
}

export const LYRICS_TRANSLATOR = Symbol("LYRICS_TRANSLATOR")

/** Settings of the translation endpoint that the services read. */
export interface LyricsSettings {
  /** From this share of the monthly allowance on, no new lyrics are translated. */
  stopAtPercent: number
}

export const LYRICS_SETTINGS = Symbol("LYRICS_SETTINGS")
