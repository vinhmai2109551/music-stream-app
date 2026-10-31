export interface PremiumPlan {
  id: string
  name: string
  /** Shown in the pill next to the price. */
  trial: string
  /** Price per month, in US dollars (the design's currency). */
  price: string
  features: readonly string[]
}

const COMMON_FEATURES = [
  "Ad-free listening",
  "Download to listen offline",
  "Access full catalog Premium",
  "High sound quality",
  "Cancel anytime",
] as const

/** The plans of the subscription screen. There is no payment: any of them starts Premium. */
export const PREMIUM_PLANS: readonly PremiumPlan[] = [
  {
    id: "individual",
    name: "Premium",
    trial: "Free for 1 month",
    price: "$12.99",
    features: COMMON_FEATURES,
  },
  {
    id: "duo",
    name: "Premium Duo",
    trial: "Free for 1 month",
    price: "$16.99",
    features: ["For 2 accounts", ...COMMON_FEATURES],
  },
  {
    id: "family",
    name: "Premium Family",
    trial: "Free for 1 month",
    price: "$19.99",
    features: ["Up to 6 accounts", ...COMMON_FEATURES],
  },
]
