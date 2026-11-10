import { NotFoundException } from "@nestjs/common"
import type {
  LyricsInput,
  LyricsSettings,
  LyricsStore,
  LyricsTranslator,
  StoredLyrics,
  StoredTranslation,
  TrackDirectory,
  TranslationInput,
} from "../ports.js"

export const LANGUAGES = ["vi", "en-US", "ko", "ja", "zh-Hans"] as const

/** The tables, in memory; the unique key of the translations works like the real one. */
export class InMemoryLyricsStore implements LyricsStore {
  readonly lyrics = new Map<string, StoredLyrics>()
  readonly translations: StoredTranslation[] = []
  private counter = 0

  findLyrics(trackId: string): Promise<StoredLyrics | null> {
    return Promise.resolve(this.lyrics.get(trackId) ?? null)
  }

  upsertLyrics(input: LyricsInput): Promise<StoredLyrics> {
    const kept = this.lyrics.get(input.trackId)
    const stored: StoredLyrics = {
      ...input,
      id: kept?.id ?? `lyrics-${++this.counter}`,
      updatedAt: new Date(),
    }
    this.lyrics.set(input.trackId, stored)
    return Promise.resolve(stored)
  }

  deleteStaleTranslations(lyricsId: string, currentHash: string): Promise<void> {
    for (let i = this.translations.length - 1; i >= 0; i--) {
      const row = this.translations[i]
      if (row.lyricsId === lyricsId && row.sourceHash !== currentHash)
        this.translations.splice(i, 1)
    }
    return Promise.resolve()
  }

  findTranslation(lyricsId: string, targetLanguage: string, sourceHash: string) {
    return Promise.resolve(
      this.translations.find(
        (row) =>
          row.lyricsId === lyricsId &&
          row.targetLanguage === targetLanguage &&
          row.sourceHash === sourceHash,
      ) ?? null,
    )
  }

  saveTranslation(input: TranslationInput): Promise<StoredTranslation> {
    // Checked and written in one step, like the unique key of the table.
    const kept = this.translations.find(
      (row) =>
        row.lyricsId === input.lyricsId &&
        row.targetLanguage === input.targetLanguage &&
        row.sourceHash === input.sourceHash,
    )
    if (kept) return Promise.resolve(kept)
    const row: StoredTranslation = { ...input, id: `tr-${++this.counter}`, createdAt: new Date() }
    this.translations.push(row)
    return Promise.resolve(row)
  }
}

/** Knows the tracks it is given; any other id is a 404, as in the tracks module. */
export class FakeTrackDirectory implements TrackDirectory {
  constructor(private readonly tracks: Record<string, { title: string; artist: string }>) {}

  find(trackId: string): Promise<{ title: string; artist: string }> {
    const track = this.tracks[trackId]
    return track ? Promise.resolve(track) : Promise.reject(new NotFoundException("Track not found"))
  }
}

/** Writes "[<language>] <line>" for a line with words and leaves a blank line alone. */
export class FakeLyricsTranslator implements LyricsTranslator {
  readonly calls: { lines: readonly string[]; target: string; source: string }[] = []
  readonly guards: number[] = []
  /** Set to make the next calls wait, fail, or return a wrong number of lines. */
  delayMs = 0
  failWith: Error | null = null
  dropLastLine = false
  guard: (() => Promise<void>) | null = null

  parseLanguage(code: string): string | null {
    return (
      LANGUAGES.find((language) => language.toLowerCase() === code.trim().toLowerCase()) ?? null
    )
  }

  async assertUsageBelow(percent: number): Promise<void> {
    this.guards.push(percent)
    await this.guard?.()
  }

  async translate(lines: readonly string[], target: string, source: string) {
    this.calls.push({ lines, target, source })
    if (this.delayMs > 0) await new Promise((resolve) => setTimeout(resolve, this.delayMs))
    if (this.failWith) throw this.failWith
    const out = lines.map((line) => (line.trim() === "" ? line : `[${target}] ${line}`))
    if (this.dropLastLine) out.pop()
    return { lines: out, billedCharacters: lines.reduce((sum, line) => sum + line.length, 0) }
  }
}

export const SETTINGS: LyricsSettings = { stopAtPercent: 90 }
