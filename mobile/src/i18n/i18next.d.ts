import type vi from "./locales/vi.json"

// Makes t("...") check its key against locales/vi.json, the source of every text.
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation"
    resources: { translation: typeof vi }
  }
}
