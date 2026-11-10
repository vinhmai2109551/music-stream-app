import { Inject, Injectable, Logger } from "@nestjs/common"
import { Semaphore } from "./limiter.js"
import { planBatches, TextTooLargeError } from "./translation-batches.js"
import {
  deeplSourceCode,
  deeplTargetCode,
  APP_LANGUAGES,
  parseAppLanguage,
  type AppLanguage,
} from "./translation-languages.js"
import {
  languageNotSupported,
  textTooLarge,
  translationBusy,
  translationNotConfigured,
  translationQuotaExceeded,
  translationRejected,
  translationUnavailable,
} from "./translation.errors.js"
import {
  TRANSLATOR,
  TranslatorFailure,
  type TranslatedText,
  type Translator,
  type TranslatorRequest,
} from "./translator.port.js"
import { UsageMonitor, type TranslationUsage } from "./usage-monitor.js"

/** DeepL requests that may be on their way at once. */
const MAX_IN_FLIGHT = 2
/** After DeepL says the allowance is used up, nobody asks it again for this long. */
const QUOTA_COOLDOWN_MS = 15 * 60 * 1000

export interface TranslateOptions {
  /** Language of the texts; leave it out to let DeepL detect it. */
  source?: string | null
  /** The texts hold tags (placeholders) that must come back unchanged and in place. */
  tagHandling?: "xml"
  /** With `tagHandling`: the tags whose content is not translated. */
  ignoreTags?: string[]
}

export interface TranslateResult {
  /** One translation per text, in the order of the texts. */
  texts: string[]
  /** What DeepL billed, in characters; zero when nothing had to be sent. */
  billedCharacters: number
}

const isBlank = (text: string): boolean => text.trim().length === 0

/**
 * Translates lists of texts through DeepL. It keeps the order, sends each distinct text once,
 * never sends a blank text, cuts the work into requests DeepL accepts and turns whatever goes wrong
 * into an error the app can show (503 for DeepL's troubles, 400 for a bad request).
 *
 * Without a key it still loads: translating answers 503 `TRANSLATION_NOT_CONFIGURED`.
 * The texts (lyrics too) and the key are never logged.
 */
@Injectable()
export class TranslationService {
  private readonly logger = new Logger("Translation")
  private readonly inFlight = new Semaphore(MAX_IN_FLIGHT)
  private readonly monitor: UsageMonitor
  private quotaBlockedUntil = 0

  constructor(@Inject(TRANSLATOR) private readonly translator: Translator | null) {
    this.monitor = new UsageMonitor(translator, (message) => this.logger.warn(message))
  }

  /** Whether there is an engine to translate with. */
  isConfigured(): boolean {
    return this.translator !== null
  }

  /** The languages that may be translated to. */
  get languages(): readonly AppLanguage[] {
    return APP_LANGUAGES
  }

  async translate(
    texts: readonly string[],
    target: string,
    options: TranslateOptions = {},
  ): Promise<TranslateResult> {
    const targetLanguage = parseAppLanguage(target)
    if (!targetLanguage) throw languageNotSupported(APP_LANGUAGES)
    const sourceLanguage = this.parseSource(options.source)
    const translator = this.requireTranslator() // no key: always an error, even for nothing to do
    if (texts.length === 0) return { texts: [], billedCharacters: 0 }
    // Already in the language asked for: nothing to spend.
    if (sourceLanguage === targetLanguage) return { texts: [...texts], billedCharacters: 0 }

    // A distinct text is sent once; a blank one is not sent at all (it keeps its place).
    const unique: string[] = []
    const place = new Map<string, number>()
    for (const text of texts) {
      if (!isBlank(text) && !place.has(text)) {
        place.set(text, unique.length)
        unique.push(text)
      }
    }
    if (unique.length === 0) return { texts: [...texts], billedCharacters: 0 }

    const batches = this.plan(unique)
    this.assertQuotaAvailable()

    const request: TranslatorRequest = {
      source: sourceLanguage ? deeplSourceCode(sourceLanguage) : null,
      target: deeplTargetCode(targetLanguage),
      ...(options.tagHandling ? { tagHandling: options.tagHandling } : {}),
      ...(options.ignoreTags?.length ? { ignoreTags: options.ignoreTags } : {}),
    }
    const translated: string[] = new Array<string>(unique.length)
    let billed = 0
    for (const batch of batches) {
      const results = await this.send(
        translator,
        batch.map((index) => unique[index]),
        request,
      )
      batch.forEach((index, position) => {
        translated[index] = results[position].text
        billed += results[position].billedCharacters
      })
    }

    this.monitor.record(billed)
    void this.monitor.checkIfDue()
    // Counts only: what was translated is not written anywhere.
    this.logger.log(
      `Translated ${unique.length} texts to ${targetLanguage} (${billed} characters billed)`,
    )
    return {
      texts: texts.map((text) => (isBlank(text) ? text : translated[place.get(text) as number])),
      billedCharacters: billed,
    }
  }

  /** The usage of the allowance, read from DeepL now (for an administrator). */
  async usage(): Promise<TranslationUsage> {
    if (!this.translator) return this.monitor.snapshot()
    try {
      return await this.monitor.refresh()
    } catch (error) {
      throw this.toHttpError(error)
    }
  }

  private parseSource(source: string | null | undefined): AppLanguage | null {
    if (source === null || source === undefined) return null
    const language = parseAppLanguage(source)
    if (!language) throw languageNotSupported(APP_LANGUAGES)
    return language
  }

  private plan(unique: string[]): number[][] {
    try {
      return planBatches(unique)
    } catch (error) {
      if (error instanceof TextTooLargeError) throw textTooLarge()
      throw error
    }
  }

  private requireTranslator(): Translator {
    if (!this.translator) throw translationNotConfigured()
    return this.translator
  }

  private assertQuotaAvailable(): void {
    if (Date.now() < this.quotaBlockedUntil) throw translationQuotaExceeded()
  }

  private async send(
    translator: Translator,
    texts: string[],
    request: TranslatorRequest,
  ): Promise<TranslatedText[]> {
    try {
      const results = await this.inFlight.run(() => translator.translate(texts, request))
      // The positions of the answers are the positions of the texts: a short answer is not usable.
      if (results.length !== texts.length) throw new TranslatorFailure("unavailable")
      return results
    } catch (error) {
      throw this.toHttpError(error)
    }
  }

  /** What a failure of the engine means for the caller; the cause is logged (without any text). */
  private toHttpError(error: unknown) {
    const failure =
      error instanceof TranslatorFailure ? error : new TranslatorFailure("unavailable")
    switch (failure.kind) {
      case "auth":
        this.logger.error("DeepL refused the API key (HTTP 403): check DEEPL_API_KEY")
        return translationNotConfigured()
      case "quota":
        this.quotaBlockedUntil = Date.now() + QUOTA_COOLDOWN_MS
        this.logger.warn(
          "DeepL says the allowance is used up (HTTP 456); not asking again for a while",
        )
        return translationQuotaExceeded()
      case "rate-limited":
        this.logger.warn("DeepL is limiting requests (HTTP 429) after retries")
        return translationBusy()
      case "bad-request":
        this.logger.warn(`DeepL did not accept the request (HTTP ${failure.httpStatus ?? "4xx"})`)
        return translationRejected()
      case "unavailable":
        this.logger.warn(
          `DeepL is not available${failure.httpStatus ? ` (HTTP ${failure.httpStatus})` : ""}`,
        )
        return translationUnavailable()
    }
  }
}
