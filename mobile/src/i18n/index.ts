import { createInstance, type ParseKeys } from "i18next"
import { initReactI18next } from "react-i18next"
import { deviceLanguage } from "./deviceLanguage"
import { APP_LANGUAGES, FALLBACK_LANGUAGES } from "./languages"
import enUS from "./locales/en-US.json"
import ja from "./locales/ja.json"
import ko from "./locales/ko.json"
import vi from "./locales/vi.json"
import zhHans from "./locales/zh-Hans.json"

export { useTranslation } from "react-i18next"
export {
  APP_LANGUAGES,
  FALLBACK_LANGUAGES,
  LANGUAGE_NAMES,
  SOURCE_LANGUAGE,
  isAppLanguage,
  languageFromTag,
  type AppLanguage,
} from "./languages"
export { deviceLanguage } from "./deviceLanguage"

// The texts are bundled, so the translation is ready the moment the app starts (no flash of keys).
// A text a language lacks is looked up in Vietnamese, then in English.
const i18n = createInstance()

void i18n.use(initReactI18next).init({
  resources: {
    vi: { translation: vi },
    "en-US": { translation: enUS },
    ko: { translation: ko },
    ja: { translation: ja },
    "zh-Hans": { translation: zhHans },
  },
  lng: deviceLanguage(),
  fallbackLng: [...FALLBACK_LANGUAGES],
  supportedLngs: [...APP_LANGUAGES],
  load: "currentOnly",
  initAsync: false,
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
})

/** A key of locales/vi.json, for texts chosen before they are shown (a list of tabs, a map of labels). */
export type TranslationKey = ParseKeys

/** For code that is not a component (stores, the API client, helpers); components use useTranslation. */
export const t = i18n.t
export { i18n }
