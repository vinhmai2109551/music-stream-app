/** The languages lyrics can be written in and translated to: the app languages of the API. */
export const LYRICS_LANGUAGES = [
  { value: "vi", label: "Tiếng Việt" },
  { value: "en-US", label: "English" },
  { value: "ko", label: "한국어 (Hàn)" },
  { value: "ja", label: "日本語 (Nhật)" },
  { value: "zh-Hans", label: "简体中文 (Trung)" },
] as const

export type LyricsLanguage = (typeof LYRICS_LANGUAGES)[number]["value"]

export const isLyricsLanguage = (value: string): value is LyricsLanguage =>
  LYRICS_LANGUAGES.some((language) => language.value === value)

export function lyricsLanguageLabel(value: string): string {
  return LYRICS_LANGUAGES.find((language) => language.value === value)?.label ?? value
}

/** The language of a track (ISO 639) as the language of its lyrics; Vietnamese when unknown. */
export function lyricsLanguageFor(trackLanguage: string | null): LyricsLanguage {
  if (trackLanguage === "en") return "en-US"
  if (trackLanguage === "zh") return "zh-Hans"
  return trackLanguage !== null && isLyricsLanguage(trackLanguage) ? trackLanguage : "vi"
}

/** Languages of the vocals of a track (a 2-3 letter ISO 639 code; empty = instrumental/unknown). */
export const TRACK_LANGUAGES = [
  { value: "vi", label: "Tiếng Việt" },
  { value: "en", label: "Tiếng Anh" },
  { value: "ko", label: "Tiếng Hàn" },
  { value: "ja", label: "Tiếng Nhật" },
  { value: "zh", label: "Tiếng Trung" },
  { value: "th", label: "Tiếng Thái" },
  { value: "id", label: "Tiếng Indonesia" },
  { value: "es", label: "Tiếng Tây Ban Nha" },
  { value: "fr", label: "Tiếng Pháp" },
] as const

export const REGION_LABELS = {
  VIETNAM: "Việt Nam",
  KOREA: "Hàn Quốc",
  JAPAN: "Nhật Bản",
  CHINA: "Trung Quốc",
  GLOBAL: "Quốc tế",
} as const
