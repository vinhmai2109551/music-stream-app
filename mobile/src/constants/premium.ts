import type { TranslationKey } from "@/i18n"

export interface PremiumPlan {
  id: string
  /** Texts are keys of locales/vi.json, so the plans follow the language of the app. */
  nameKey: TranslationKey
  /** Shown in the pill next to the price. */
  trialKey: TranslationKey
  /** Price per month, in US dollars (the design's currency). */
  price: string
  featureKeys: readonly TranslationKey[]
}

const COMMON_FEATURES = [
  "premium.features.adFree",
  "premium.features.offline",
  "premium.features.fullCatalog",
  "premium.features.highQuality",
  "premium.features.cancelAnytime",
] as const

/** The plans of the subscription screen. There is no payment: any of them starts Premium. */
export const PREMIUM_PLANS: readonly PremiumPlan[] = [
  {
    id: "individual",
    nameKey: "premium.plans.individual.name",
    trialKey: "premium.plans.individual.trial",
    price: "$12.99",
    featureKeys: COMMON_FEATURES,
  },
  {
    id: "duo",
    nameKey: "premium.plans.duo.name",
    trialKey: "premium.plans.duo.trial",
    price: "$16.99",
    featureKeys: ["premium.features.accounts2", ...COMMON_FEATURES],
  },
  {
    id: "family",
    nameKey: "premium.plans.family.name",
    trialKey: "premium.plans.family.trial",
    price: "$19.99",
    featureKeys: ["premium.features.accounts6", ...COMMON_FEATURES],
  },
]
