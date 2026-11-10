/** The languages of the app. The codes match the ones the backend translates to. */
export const APP_LANGUAGES = ["vi", "en-US", "ko", "ja", "zh-Hans"] as const
export type AppLanguage = (typeof APP_LANGUAGES)[number]

/** The language the texts are written in (locales/vi.json); every other one is translated from it. */
export const SOURCE_LANGUAGE: AppLanguage = "vi"

/** A missing text is looked up in these, in this order, after the language in use. */
export const FALLBACK_LANGUAGES: readonly AppLanguage[] = ["vi", "en-US"]

/** Each language in its own words: the picker shows them as they are and they are never translated. */
export const LANGUAGE_NAMES: Record<AppLanguage, string> = {
  vi: "Tiếng Việt",
  "en-US": "English",
  ko: "한국어",
  ja: "日本語",
  "zh-Hans": "简体中文",
}

export function isAppLanguage(value: unknown): value is AppLanguage {
  return typeof value === "string" && (APP_LANGUAGES as readonly string[]).includes(value)
}

/**
 * The app language that fits a device language tag ("vi-VN", "en-GB", "zh-Hant-TW", "ko"), or null
 * when the app has none for it. Any Chinese maps to the simplified one: it is the only Chinese there is.
 */
export function languageFromTag(tag: string | null | undefined): AppLanguage | null {
  const code = tag?.trim().split(/[-_]/)[0]?.toLowerCase()
  switch (code) {
    case "vi":
      return "vi"
    case "en":
      return "en-US"
    case "ko":
      return "ko"
    case "ja":
      return "ja"
    case "zh":
      return "zh-Hans"
    default:
      return null
  }
}
