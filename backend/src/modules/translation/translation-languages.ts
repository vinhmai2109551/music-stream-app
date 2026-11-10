/**
 * The languages of the app and the codes DeepL knows them by. Only these can be translated to; any
 * other value is refused before DeepL is asked (it keeps a typo, or a language nobody reviewed,
 * from spending the monthly allowance).
 */
export const APP_LANGUAGES = ["vi", "en-US", "ko", "ja", "zh-Hans"] as const

export type AppLanguage = (typeof APP_LANGUAGES)[number]

/** The language the interface texts are written in. */
export const SOURCE_LANGUAGE: AppLanguage = "vi"

/** The code DeepL wants for a language it translates TO. */
const DEEPL_TARGET: Record<AppLanguage, string> = {
  vi: "VI",
  "en-US": "EN-US",
  ko: "KO",
  ja: "JA",
  "zh-Hans": "ZH-HANS",
}

/** The code DeepL wants for a language it translates FROM (no regional variants there). */
const DEEPL_SOURCE: Record<AppLanguage, string> = {
  vi: "VI",
  "en-US": "EN",
  ko: "KO",
  ja: "JA",
  "zh-Hans": "ZH",
}

const BY_LOWER_CASE = new Map<string, AppLanguage>(
  APP_LANGUAGES.map((language) => [language.toLowerCase(), language]),
)

/** The app language a code stands for (case does not matter: `en-us` is `en-US`), or null. */
export function parseAppLanguage(code: unknown): AppLanguage | null {
  if (typeof code !== "string") return null
  return BY_LOWER_CASE.get(code.trim().toLowerCase()) ?? null
}

export const deeplTargetCode = (language: AppLanguage): string => DEEPL_TARGET[language]
export const deeplSourceCode = (language: AppLanguage): string => DEEPL_SOURCE[language]
