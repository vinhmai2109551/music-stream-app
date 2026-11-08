import { cosineSimilarity } from "../embeddings/vector-math.js"

/** MMR trade-off: 1 = only relevance, 0 = only variety. */
export const MMR_LAMBDA = 0.7
/** No artist fills a list: at most this many tracks of one artist. */
export const MAX_PER_ARTIST = 3

export interface Candidate {
  id: string
  artistId: string
  /** How close the track is to what was asked for (cosine similarity). */
  relevance: number
  vector: readonly number[]
}

export interface DiversifyOptions {
  limit: number
  lambda?: number
  maxPerArtist?: number
}

/**
 * Maximal Marginal Relevance: picks `limit` candidates one at a time, each time the one with the
 * best `lambda * relevance - (1 - lambda) * (similarity to the closest already picked)`, so a list
 * of near-identical songs becomes a varied one. No artist gets more than `maxPerArtist` places.
 * Ties go to the earlier candidate, so the same input always gives the same list.
 */
export function selectDiverse(
  candidates: readonly Candidate[],
  { limit, lambda = MMR_LAMBDA, maxPerArtist = MAX_PER_ARTIST }: DiversifyOptions,
): Candidate[] {
  const picked: Candidate[] = []
  const perArtist = new Map<string, number>()
  const remaining = [...candidates]

  while (picked.length < limit && remaining.length > 0) {
    let best = -1
    let bestScore = -Infinity
    for (let index = 0; index < remaining.length; index += 1) {
      const candidate = remaining[index]
      if ((perArtist.get(candidate.artistId) ?? 0) >= maxPerArtist) continue
      const closest = picked.reduce(
        (max, other) => Math.max(max, cosineSimilarity(candidate.vector, other.vector)),
        0,
      )
      const score = lambda * candidate.relevance - (1 - lambda) * closest
      if (score > bestScore) {
        best = index
        bestScore = score
      }
    }
    if (best === -1) break // everyone left belongs to an artist that is full
    const [chosen] = remaining.splice(best, 1)
    picked.push(chosen)
    perArtist.set(chosen.artistId, (perArtist.get(chosen.artistId) ?? 0) + 1)
  }
  return picked
}

/** Keeps the order of `ids` but lets each artist appear at most `maxPerArtist` times. */
export function capPerArtist<T extends { artistId: string }>(
  items: readonly T[],
  maxPerArtist: number = MAX_PER_ARTIST,
): T[] {
  const counts = new Map<string, number>()
  return items.filter((item) => {
    const count = counts.get(item.artistId) ?? 0
    if (count >= maxPerArtist) return false
    counts.set(item.artistId, count + 1)
    return true
  })
}
