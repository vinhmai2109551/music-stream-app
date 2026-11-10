/** Public API of the translation module. Other modules must import from here only. */
export { TranslationModule } from "./translation.module.js"
export { TranslationService } from "./translation.service.js"
export type { TranslateOptions, TranslateResult } from "./translation.service.js"
export type { TranslationUsage } from "./usage-monitor.js"
export {
  APP_LANGUAGES,
  SOURCE_LANGUAGE,
  parseAppLanguage,
  type AppLanguage,
} from "./translation-languages.js"
