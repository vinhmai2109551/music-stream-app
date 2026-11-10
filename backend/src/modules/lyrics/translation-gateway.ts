import { Injectable } from "@nestjs/common"
import { parseAppLanguage, TranslationService } from "../translation/index.js"
import type { LyricsTranslator } from "./ports.js"

/**
 * Lyrics go to DeepL through the translation module, plain text (no tags), one element per line.
 * That module keeps the order, skips blank lines without losing their place, sends a repeated line
 * once, and is the only one that logs (counts only, never the text).
 */
@Injectable()
export class TranslationGateway implements LyricsTranslator {
  constructor(private readonly translation: TranslationService) {}

  parseLanguage(code: string): string | null {
    return parseAppLanguage(code)
  }

  assertUsageBelow(percent: number): Promise<void> {
    return this.translation.assertUsageBelow(percent)
  }

  async translate(lines: readonly string[], target: string, source: string) {
    const result = await this.translation.translate(lines, target, { source })
    return { lines: result.texts, billedCharacters: result.billedCharacters }
  }
}
