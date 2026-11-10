import type {
  TranslatedText,
  Translator,
  TranslatorRequest,
  TranslatorUsage,
} from "./translator.port.js"

/**
 * A translator that calls nobody, for tests and offline development (`TRANSLATION_PROVIDER=fake`,
 * refused in production). It writes `[<target>] <text>`, keeps the tags of `xml` texts, and bills
 * one character per character, like DeepL does.
 */
export class FakeTranslator implements Translator {
  /** Every request received, to look at in a test. */
  readonly requests: { texts: string[]; request: TranslatorRequest }[] = []
  private used = 0

  constructor(private readonly limit = 500_000) {}

  async translate(texts: string[], request: TranslatorRequest): Promise<TranslatedText[]> {
    this.requests.push({ texts: [...texts], request })
    return texts.map((text) => {
      this.used += text.length
      return { text: `[${request.target}] ${text}`, billedCharacters: text.length }
    })
  }

  async usage(): Promise<TranslatorUsage> {
    return { used: this.used, limit: this.limit }
  }
}
