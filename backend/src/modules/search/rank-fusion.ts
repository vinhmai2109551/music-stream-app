/** Reciprocal Rank Fusion constant: Cormack et al. suggest 60, which most systems use. */
export const RRF_K = 60

export interface FusedItem {
  id: string
  /** Sum over the lists of 1 / (k + rank), the rank of the first item being 1. */
  score: number
  /** Indexes of the lists that hold this item. */
  sources: number[]
}

/**
 * Reciprocal Rank Fusion: merges several ranked lists of ids into one. An item scores
 * `1 / (k + rank)` in every list that holds it, and the scores add up, so an item that is high in
 * both lists beats one that is first in only one. Only the order of each list matters, not the
 * scores behind it, which is why lists as different as a keyword match and a vector distance can
 * be combined. Ties go to the item that came first in the earlier list.
 */
export function reciprocalRankFusion(
  lists: readonly (readonly string[])[],
  k: number = RRF_K,
): FusedItem[] {
  const items = new Map<string, FusedItem & { order: number }>()
  let order = 0
  lists.forEach((list, source) => {
    const seen = new Set<string>()
    list.forEach((id, index) => {
      // An id repeated inside one list counts once, at its best (first) place.
      if (seen.has(id)) return
      seen.add(id)
      const gain = 1 / (k + index + 1)
      const item = items.get(id)
      if (item) {
        item.score += gain
        item.sources.push(source)
      } else {
        items.set(id, { id, score: gain, sources: [source], order: order++ })
      }
    })
  })
  return [...items.values()]
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .map(({ id, score, sources }) => ({ id, score, sources }))
}
