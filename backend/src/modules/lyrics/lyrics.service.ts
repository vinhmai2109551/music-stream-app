import { Inject, Injectable } from "@nestjs/common"
import {
  MAX_LINE_CHARACTERS,
  MAX_LINES,
  MAX_TOTAL_CHARACTERS,
  hasWords,
  lyricsContentHash,
  normalizeLines,
  totalCharacters,
} from "./lyrics-text.js"
import { lyricsInvalid, lyricsNotFound } from "./lyrics.errors.js"
import {
  LYRICS_LANGUAGES,
  LYRICS_SOURCE,
  LYRICS_STORE,
  TRACK_DIRECTORY,
  type LyricsSource,
  type LyricsStore,
  type SourcedLyrics,
  type StoredLyrics,
  type TrackDirectory,
} from "./ports.js"

export interface LyricsView {
  trackId: string
  language: string
  /** One element per line; a blank line is "". */
  lines: string[]
  /** Start of each line in milliseconds; null when the lyrics have no timings. */
  timingsMs: number[] | null
  /** Where the text comes from ("demo", "manual" or a provider). */
  source: string
  updatedAt: string
}

export interface PutLyricsInput {
  language: string
  lines: string[]
  timingsMs?: number[]
  source: string
}

export const toLyricsView = (lyrics: StoredLyrics): LyricsView => ({
  trackId: lyrics.trackId,
  language: lyrics.language,
  lines: lyrics.lines,
  timingsMs: lyrics.timingsMs.length > 0 ? lyrics.timingsMs : null,
  source: lyrics.source,
  updatedAt: lyrics.updatedAt.toISOString(),
})

/**
 * The original lyrics of tracks. They are written by an administrator (or fetched from a source,
 * when one is connected) and read by any logged-in user. No other module reads them: the assistant
 * has no tool for lyrics and the track view never carries them.
 */
@Injectable()
export class LyricsService {
  constructor(
    @Inject(LYRICS_STORE) private readonly store: LyricsStore,
    @Inject(LYRICS_SOURCE) private readonly source: LyricsSource,
    @Inject(TRACK_DIRECTORY) private readonly tracks: TrackDirectory,
    @Inject(LYRICS_LANGUAGES) private readonly languages: readonly string[],
  ) {}

  async get(trackId: string): Promise<LyricsView> {
    return toLyricsView(await this.find(trackId))
  }

  /** The lyrics as kept (with their id and version), or a 404 that says the track has none. */
  async find(trackId: string): Promise<StoredLyrics> {
    const stored = await this.store.findLyrics(trackId)
    if (stored) return stored

    // Not kept yet: ask the connected source, if there is one. The track must exist (404 otherwise).
    const track = await this.tracks.find(trackId)
    const found = await this.source.fetch({
      trackId,
      title: track.title,
      artist: track.artist,
    })
    if (!found) throw lyricsNotFound()
    return this.save(trackId, found)
  }

  /** Writes (or replaces) the lyrics of a track; translations of an older text are dropped. */
  async put(trackId: string, input: PutLyricsInput): Promise<LyricsView> {
    await this.tracks.find(trackId) // 404 when there is no such track
    return toLyricsView(await this.save(trackId, input))
  }

  private async save(
    trackId: string,
    input: SourcedLyrics | PutLyricsInput,
  ): Promise<StoredLyrics> {
    const lines = this.checkedLines(input.language, input.lines)
    const timingsMs = input.timingsMs ?? []
    if (timingsMs.length > 0 && timingsMs.length !== lines.length) {
      throw lyricsInvalid("Mốc thời gian phải có số phần tử bằng số dòng lời.")
    }
    const contentHash = lyricsContentHash(input.language, lines)
    const stored = await this.store.upsertLyrics({
      trackId,
      language: input.language,
      lines,
      timingsMs,
      source: input.source,
      contentHash,
    })
    await this.store.deleteStaleTranslations(stored.id, contentHash)
    return stored
  }

  private checkedLines(language: string, raw: readonly string[]): string[] {
    if (!this.languages.includes(language)) {
      throw lyricsInvalid(`Ngôn ngữ của lời phải là một trong: ${this.languages.join(", ")}.`)
    }
    const lines = normalizeLines(raw)
    if (!hasWords(lines)) throw lyricsInvalid("Lời bài hát không được để trống.")
    if (lines.length > MAX_LINES) throw lyricsInvalid(`Lời bài hát tối đa ${MAX_LINES} dòng.`)
    if (lines.some((line) => line.length > MAX_LINE_CHARACTERS)) {
      throw lyricsInvalid(`Mỗi dòng tối đa ${MAX_LINE_CHARACTERS} ký tự.`)
    }
    if (totalCharacters(lines) > MAX_TOTAL_CHARACTERS) {
      throw lyricsInvalid(`Lời bài hát tối đa ${MAX_TOTAL_CHARACTERS} ký tự.`)
    }
    return lines
  }
}
