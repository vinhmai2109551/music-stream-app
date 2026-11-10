import { getLocales } from "expo-localization"
import { FALLBACK_LANGUAGES, languageFromTag, type AppLanguage } from "./languages"

/** The app language that fits the phone's language settings, the first match of its list of languages. */
export function deviceLanguage(): AppLanguage {
  for (const locale of getLocales()) {
    const language = languageFromTag(locale.languageTag)
    if (language) return language
  }
  return FALLBACK_LANGUAGES[0]
}
