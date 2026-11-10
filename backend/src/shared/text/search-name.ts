/** Latin letters that do not break down into a base letter and an accent, and what to search them as. */
const UNDECOMPOSABLE: Readonly<Record<string, string>> = {
  đ: "d",
  ł: "l",
  ø: "o",
  ð: "d",
  ħ: "h",
  ı: "i",
  ß: "ss",
  æ: "ae",
  œ: "oe",
  þ: "th",
}

/**
 * A name as it is compared when searching: lower case, Latin letters without accents, everything
 * that is not a letter or a digit turned into a single space.
 *
 *   "Sơn Tùng M-TP"  ->  "son tung m tp"
 *   "Đen Vâu"        ->  "den vau"
 *   "(G)I-DLE"       ->  "g i dle"
 *
 * Only the accents of LATIN letters go: a Japanese "が" stays "が" (it is not "か"), and Korean,
 * Chinese and Japanese names stay as they are. The same function is applied to the name when it
 * is saved and to what the person types, so the two always agree.
 */
export function toSearchName(text: string): string {
  return (
    text
      .normalize("NFD")
      .replace(/(\p{Script=Latin})\p{M}+/gu, "$1")
      .normalize("NFC")
      .toLowerCase()
      // Latin letters that carry a stroke or are ligatures do not decompose into letter + accent.
      .replace(/[đđłøðħıßæœþ]/gu, (letter) => UNDECOMPOSABLE[letter] ?? letter)
      // A mark that belongs to a non-Latin letter (a Thai vowel, a Devanagari sign) is part of the
      // word, so it must not split it.
      .replace(/[^\p{L}\p{N}\p{M}]+/gu, " ")
      .trim()
  )
}
