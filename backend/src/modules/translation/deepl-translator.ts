import {
  ArgumentError,
  AuthorizationError,
  ConnectionError,
  DeepLClient,
  DeepLError,
  QuotaExceededError,
  TooManyRequestsError,
  type TextResult,
  type TranslateTextOptions,
} from "deepl-node"
import {
  TranslatorFailure,
  type TranslatedText,
  type Translator,
  type TranslatorRequest,
  type TranslatorUsage,
} from "./translator.port.js"

/** The part of the DeepL client this adapter uses (so a test can stand in for it). */
export interface DeepLClientLike {
  translateText(
    texts: string[],
    sourceLang: string | null,
    targetLang: string,
    options?: TranslateTextOptions,
  ): Promise<TextResult[]>
  getUsage(): Promise<{ character?: { count: number; limit: number } }>
}

/** How the SDK's errors read in the vocabulary of the service. */
export function toTranslatorFailure(error: unknown): TranslatorFailure {
  if (error instanceof TranslatorFailure) return error
  if (error instanceof AuthorizationError) return new TranslatorFailure("auth", 403)
  if (error instanceof QuotaExceededError) return new TranslatorFailure("quota", 456)
  if (error instanceof TooManyRequestsError) return new TranslatorFailure("rate-limited", 429)
  if (error instanceof ConnectionError) return new TranslatorFailure("unavailable")
  if (error instanceof ArgumentError) return new TranslatorFailure("bad-request")
  if (error instanceof DeepLError) {
    const status = error.httpStatusCode
    if (status !== undefined && status >= 400 && status < 500) {
      return new TranslatorFailure("bad-request", status)
    }
    return new TranslatorFailure("unavailable", status)
  }
  return new TranslatorFailure("unavailable")
}

/**
 * DeepL through its official SDK. The SDK already retries 429, 5xx and network failures with an
 * exponential backoff (`maxRetries`), and never retries a 456; so no retry loop is written here.
 *
 * The SDK writes the texts of a request in its debug log. Nothing in this app turns that level on,
 * and nothing must: lyrics must not reach a log.
 */
export class DeepLTranslator implements Translator {
  constructor(private readonly client: DeepLClientLike) {}

  async translate(texts: string[], request: TranslatorRequest): Promise<TranslatedText[]> {
    try {
      const options: TranslateTextOptions = {}
      if (request.tagHandling) options.tagHandling = request.tagHandling
      if (request.ignoreTags?.length) options.ignoreTags = request.ignoreTags
      const results = await this.client.translateText(
        texts,
        request.source,
        request.target,
        options,
      )
      return results.map((result) => ({
        text: result.text,
        billedCharacters: result.billedCharacters,
      }))
    } catch (error) {
      throw toTranslatorFailure(error)
    }
  }

  async usage(): Promise<TranslatorUsage> {
    try {
      const { character } = await this.client.getUsage()
      if (!character) throw new TranslatorFailure("unavailable")
      return { used: character.count, limit: character.limit }
    } catch (error) {
      throw toTranslatorFailure(error)
    }
  }
}

export interface DeepLSettings {
  apiKey: string
  /** Retries after the first attempt for 429, 5xx and network failures. */
  maxRetries: number
}

/** The real thing. The SDK picks the free or the paid address from the key (`:fx` = free). */
export function createDeepLTranslator(settings: DeepLSettings): DeepLTranslator {
  const client = new DeepLClient(settings.apiKey, { maxRetries: settings.maxRetries })
  return new DeepLTranslator(client)
}
