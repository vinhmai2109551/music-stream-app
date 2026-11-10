/** Retries (after the first attempt) the DeepL SDK makes for a 429, a 5xx or a network failure. */
export const DEFAULT_MAX_RETRIES = 3

export interface TranslationConfig {
  /** The DeepL key, or null: without it the translation feature is off. */
  apiKey: string | null
  maxRetries: number
  /** `fake`: a stand-in that calls nobody (tests and offline development only). */
  provider: "deepl" | "fake"
}

/** The settings of the translation module (`DEEPL_*`), read once. */
export function readTranslationConfig(
  read: (key: string) => string | undefined,
): TranslationConfig {
  const apiKey = read("DEEPL_API_KEY")?.trim()
  const retries = read("DEEPL_MAX_RETRIES")?.trim()
  return {
    apiKey: apiKey || null,
    maxRetries: retries ? Number(retries) : DEFAULT_MAX_RETRIES,
    provider: read("TRANSLATION_PROVIDER")?.trim().toLowerCase() === "fake" ? "fake" : "deepl",
  }
}
