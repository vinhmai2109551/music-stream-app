import { Inject, Injectable } from "@nestjs/common"
import { languageNotSupported, translationFailed } from "./lyrics.errors.js"
import { LyricsService } from "./lyrics.service.js"
import {
  LYRICS_LANGUAGES,
  LYRICS_SETTINGS,
  LYRICS_STORE,
  LYRICS_TRANSLATOR,
  type LyricsSettings,
  type LyricsStore,
  type LyricsTranslator,
  type StoredLyrics,
  type StoredTranslation,
} from "./ports.js"

export interface LyricsTranslationView {
  trackId: string
  sourceLanguage: string
  targetLanguage: string
  /** One element per original line, same positions; a blank line stays blank. */
  lines: string[]
  /** "deepl", or "original" when the lyrics are already in the language asked for. */
  provider: string
  /** True when no translation was made for this request (it was kept, or none was needed). */
  cached: boolean
  /** When the translation was made; null for "original". */
  translatedAt: string | null
}

/**
 * Translations of lyrics. A translation is made once for a version of the lyrics and a language, kept
 * in the database, and served from there afterwards: DeepL is called again only for lyrics that
 * changed. Requests that arrive at the same moment for the same song and language share one call.
 */
@Injectable()
export class LyricsTranslationService {
  /** Translations being made right now, by lyrics, version and language. */
  private readonly inFlight = new Map<string, Promise<StoredTranslation>>()

  constructor(
    @Inject(LYRICS_STORE) private readonly store: LyricsStore,
    @Inject(LYRICS_TRANSLATOR) private readonly translator: LyricsTranslator,
    @Inject(LYRICS_SETTINGS) private readonly settings: LyricsSettings,
    @Inject(LYRICS_LANGUAGES) private readonly languages: readonly string[],
    private readonly lyrics: LyricsService,
  ) {}

  async translate(trackId: string, language: string): Promise<LyricsTranslationView> {
    const target = this.translator.parseLanguage(language)
    if (!target) throw languageNotSupported(this.languages)

    const original = await this.lyrics.find(trackId)
    // Already in that language: show the lyrics as they are; nothing is sent to DeepL.
    if (original.language === target) {
      return {
        trackId,
        sourceLanguage: original.language,
        targetLanguage: target,
        lines: original.lines,
        provider: "original",
        cached: true,
        translatedAt: null,
      }
    }

    const kept = await this.store.findTranslation(original.id, target, original.contentHash)
    if (kept) return this.view(original, kept, true)

    // A new translation spends the allowance: not when it is nearly used up.
    await this.translator.assertUsageBelow(this.settings.stopAtPercent)
    const made = await this.makeOnce(original, target)
    return this.view(original, made.translation, !made.mine)
  }

  /** One call per lyrics, version and language at a time; the others wait for it and share its result. */
  private async makeOnce(
    original: StoredLyrics,
    target: string,
  ): Promise<{ translation: StoredTranslation; mine: boolean }> {
    const key = `${original.id}:${original.contentHash}:${target}`
    const running = this.inFlight.get(key)
    if (running) return { translation: await running, mine: false }

    const work = this.make(original, target).finally(() => this.inFlight.delete(key))
    this.inFlight.set(key, work)
    return { translation: await work, mine: true }
  }

  private async make(original: StoredLyrics, target: string): Promise<StoredTranslation> {
    const result = await this.translator.translate(original.lines, target, original.language)
    // One translated line for every line, in place: a short answer would shift the lyrics.
    if (result.lines.length !== original.lines.length) throw translationFailed()
    return this.store.saveTranslation({
      lyricsId: original.id,
      targetLanguage: target,
      sourceHash: original.contentHash,
      lines: result.lines,
      provider: "deepl",
      billedCharacters: result.billedCharacters,
    })
  }

  private view(
    original: StoredLyrics,
    translation: StoredTranslation,
    cached: boolean,
  ): LyricsTranslationView {
    return {
      trackId: original.trackId,
      sourceLanguage: original.language,
      targetLanguage: translation.targetLanguage,
      lines: translation.lines,
      provider: translation.provider,
      cached,
      translatedAt: translation.createdAt.toISOString(),
    }
  }
}
