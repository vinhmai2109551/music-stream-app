/** A thing found by the keyword search, with its texts already in search form (`toSearchName`). */
export interface KeywordCandidate {
  id: string
  /** Its own name: the title of a track, the name of an artist. */
  name: string
  /** A second name that may also match: the artist of a track. Empty when there is none. */
  secondary: string
  /** How popular it is, to order candidates that match equally well. */
  popularity: number
}

/** 0 is the best. */
function tier(candidate: KeywordCandidate, needle: string): number {
  const { name, secondary } = candidate
  if (name === needle) return 0
  if (name.startsWith(needle)) return 1
  if (` ${name} `.includes(` ${needle} `)) return 2
  if (name.includes(needle)) return 3
  if (secondary.includes(needle)) return 4
  // It matched word by word (every word is somewhere), but not as the phrase that was typed.
  return 5
}

/**
 * The ids of the candidates, best match first: the exact name, then names that start with what
 * was typed, then names that contain it as whole words, then as part of a word, then candidates
 * whose second name (the artist) contains it, and last those that only match word by word.
 * Candidates of the same quality are ordered by popularity, then by id so the order is stable.
 */
export function rankKeywordMatches(
  candidates: readonly KeywordCandidate[],
  needle: string,
): string[] {
  return candidates
    .map((candidate) => ({ candidate, tier: tier(candidate, needle) }))
    .sort(
      (a, b) =>
        a.tier - b.tier ||
        b.candidate.popularity - a.candidate.popularity ||
        a.candidate.id.localeCompare(b.candidate.id),
    )
    .map(({ candidate }) => candidate.id)
}
