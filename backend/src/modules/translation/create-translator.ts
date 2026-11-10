import type { ConfigService } from "@nestjs/config"
import { createDeepLTranslator } from "./deepl-translator.js"
import { FakeTranslator } from "./fake-translator.js"
import { readTranslationConfig } from "./translation.config.js"
import type { Translator } from "./translator.port.js"

/**
 * The engine behind the translation feature: DeepL when there is a key, otherwise none (null),
 * which switches the feature off - translating answers 503 and the rest of the API is unaffected.
 */
export function createTranslator(config: ConfigService): Translator | null {
  const settings = readTranslationConfig((key) => config.get<string>(key))
  if (settings.provider === "fake") return new FakeTranslator()
  if (!settings.apiKey) return null
  return createDeepLTranslator({ apiKey: settings.apiKey, maxRetries: settings.maxRetries })
}
