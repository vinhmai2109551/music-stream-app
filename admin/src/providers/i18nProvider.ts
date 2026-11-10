import type { I18nProvider } from "@refinedev/core"
import { translate } from "@/i18n/vi"

/** The interface is Vietnamese only; Refine still needs a provider to ask for the texts. */
export const i18nProvider: I18nProvider = {
  translate,
  changeLocale: async () => undefined,
  getLocale: () => "vi",
}
