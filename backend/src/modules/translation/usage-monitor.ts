import type { Translator } from "./translator.port.js"

/** Characters used, as a share of the allowance, from which a warning is logged. */
export const WARN_FRACTION = 0.8
/** The usage is asked of DeepL at most this often while translating. */
export const CHECK_INTERVAL_MS = 10 * 60 * 1000

export interface TranslationUsage {
  /** False: there is no key, so nothing else is known. */
  configured: boolean
  used: number | null
  limit: number | null
  /** 0 to 100 (it may pass 100 by a little), or null when unknown. */
  percent: number | null
  /** True from 80% of the allowance on. */
  warning: boolean
}

/**
 * Keeps track of how much of the monthly allowance is used: it counts what each translation was
 * billed, asks DeepL for the true figure now and then, and logs a warning from 80% on. Only
 * numbers are logged.
 */
export class UsageMonitor {
  private used: number | null = null
  private limit: number | null = null
  private checkedAt = 0

  constructor(
    private readonly translator: Translator | null,
    private readonly warn: (message: string) => void,
  ) {}

  /** Adds what a translation was billed to the figure known so far. */
  record(billedCharacters: number): void {
    if (this.used !== null) this.used += billedCharacters
  }

  /** Asks DeepL again when the last answer is old (or there is none); never throws. */
  async checkIfDue(): Promise<void> {
    if (!this.translator || Date.now() - this.checkedAt < CHECK_INTERVAL_MS) return
    // Marked first: requests that arrive while this one is on its way do not ask again.
    this.checkedAt = Date.now()
    try {
      await this.refresh()
    } catch {
      // The figure is a courtesy; a failure to read it must not fail a translation.
    }
  }

  /** The true figure, from DeepL now. */
  async refresh(): Promise<TranslationUsage> {
    if (!this.translator) return this.snapshot()
    const { used, limit } = await this.translator.usage()
    this.used = used
    this.limit = limit
    this.checkedAt = Date.now()
    const snapshot = this.snapshot()
    if (snapshot.warning) {
      this.warn(
        `DeepL usage is at ${snapshot.percent}% of the allowance (${used} of ${limit} characters)`,
      )
    }
    return snapshot
  }

  snapshot(): TranslationUsage {
    const { used, limit } = this
    const known = this.translator !== null && used !== null && limit !== null
    const share = known && limit > 0 ? used / limit : null
    return {
      configured: this.translator !== null,
      used: known ? used : null,
      limit: known ? limit : null,
      // Rounded to a tenth for people; the warning is decided on the exact share.
      percent: share === null ? null : Math.round(share * 1000) / 10,
      warning: share !== null && share >= WARN_FRACTION,
    }
  }
}
