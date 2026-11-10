import { createHash } from "node:crypto"

/** Tags DeepL must leave alone: `<ph n="name"/>` stands for {{name}}, `<keep>…</keep>` for a brand name. */
export const IGNORE_TAGS = ["ph", "keep"] as const

const PLACEHOLDER = /\{\{\s*([A-Za-z_][\w.]*)\s*\}\}/g
const PLACEHOLDER_TAG = /<ph\s+n="([^"]+)"\s*(?:\/>|>\s*<\/ph>)/g
const LETTER_OR_DIGIT = "\\p{L}\\p{N}"

const escapeXml = (text: string): string =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

const unescapeXml = (text: string): string =>
  text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&(?:apos|#39);/g, "'")
    .replace(/&amp;/g, "&")

const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

/** The names of the {{placeholders}} of a text, sorted (a name used twice is listed twice). */
export function placeholdersOf(text: string): string[] {
  return [...text.matchAll(PLACEHOLDER)].map((match) => match[1]).sort()
}

/** The brand names (from the keep list) that appear in a text. */
export function keepTermsIn(text: string, keepTerms: readonly string[]): string[] {
  return keepTerms.filter((term) => keepPattern([term]).test(text)).sort()
}

function keepPattern(terms: readonly string[]): RegExp {
  const longestFirst = [...terms].sort((a, b) => b.length - a.length).map(escapeRegExp)
  return new RegExp(
    `(?<![${LETTER_OR_DIGIT}])(?:${longestFirst.join("|")})(?![${LETTER_OR_DIGIT}])`,
    "u",
  )
}

/**
 * The text as DeepL gets it (with tag handling "xml"): special characters escaped, every {{name}}
 * wrapped as `<ph n="name"/>` and every brand name as `<keep>…</keep>`, so none of them is translated.
 */
export function protect(text: string, keepTerms: readonly string[]): string {
  const escaped = escapeXml(text)
  const parts: string[] = []
  let last = 0
  for (const match of escaped.matchAll(PLACEHOLDER)) {
    parts.push(wrapKeepTerms(escaped.slice(last, match.index), keepTerms))
    parts.push(`<ph n="${match[1]}"/>`)
    last = match.index + match[0].length
  }
  parts.push(wrapKeepTerms(escaped.slice(last), keepTerms))
  return parts.join("")
}

function wrapKeepTerms(text: string, keepTerms: readonly string[]): string {
  if (keepTerms.length === 0) return text
  const global = new RegExp(keepPattern(keepTerms).source, "gu")
  return text.replace(global, (term) => `<keep>${term}</keep>`)
}

/** Undoes `protect` on what DeepL sent back. */
export function restore(text: string): string {
  return unescapeXml(text.replace(PLACEHOLDER_TAG, "{{$1}}").replace(/<\/?keep\s*\/?>/g, ""))
}

/** True when nothing is left to translate once placeholders and brand names are set aside. */
export function hasNothingToTranslate(protectedText: string): boolean {
  const rest = protectedText
    .replace(/<keep>.*?<\/keep>/gu, "")
    .replace(PLACEHOLDER_TAG, "")
    .replace(/&(?:amp|lt|gt);/g, "")
  return !/\p{L}/u.test(rest)
}

/**
 * What is wrong with a translation: a placeholder that was lost, added or renamed, a brand name that
 * was changed, or a tag that was left in. An empty list means it can be used.
 */
export function translationProblems(
  source: string,
  translated: string,
  keepTerms: readonly string[],
): string[] {
  const problems: string[] = []
  const wanted = placeholdersOf(source).join(",")
  if (placeholdersOf(translated).join(",") !== wanted) {
    problems.push(`placeholders differ (wanted: ${wanted || "none"})`)
  }
  for (const term of keepTermsIn(source, keepTerms)) {
    if (!translated.includes(term)) problems.push(`"${term}" was changed`)
  }
  if (/<\/?(?:ph|keep)\b/.test(translated)) problems.push("a tag was left in the text")
  if (translated.trim().length === 0) problems.push("the translation is empty")
  return problems
}

/** What a translation was made from: the text and the brand names in it. A change of either makes it stale. */
export function fingerprint(source: string, keepTerms: readonly string[]): string {
  const terms = keepTermsIn(source, keepTerms).join("\u0000")
  return createHash("sha256").update(`${source}\u0000${terms}`).digest("hex").slice(0, 16)
}
