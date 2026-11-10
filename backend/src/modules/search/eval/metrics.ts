/** Fraction of the relevant items that are among the first `k` results. */
export function recallAtK(
  ranked: readonly string[],
  relevant: ReadonlySet<string>,
  k: number,
): number {
  if (relevant.size === 0) return 0
  const found = new Set(ranked.slice(0, k).filter((id) => relevant.has(id)))
  return found.size / relevant.size
}

/** 1 / (position of the first relevant result), or 0 when none of the results is relevant. */
export function reciprocalRank(ranked: readonly string[], relevant: ReadonlySet<string>): number {
  const index = ranked.findIndex((id) => relevant.has(id))
  return index === -1 ? 0 : 1 / (index + 1)
}

/**
 * nDCG@k with yes/no relevance: a relevant result counts 1 / log2(position + 1), and the sum is
 * divided by the best sum possible (all relevant items first). 1 = the ideal order, 0 = nothing
 * relevant in the first `k`. A result listed twice counts once.
 */
export function ndcgAtK(
  ranked: readonly string[],
  relevant: ReadonlySet<string>,
  k: number,
): number {
  if (relevant.size === 0) return 0
  const seen = new Set<string>()
  let dcg = 0
  ranked.slice(0, k).forEach((id, index) => {
    if (relevant.has(id) && !seen.has(id)) {
      seen.add(id)
      dcg += 1 / Math.log2(index + 2)
    }
  })
  let ideal = 0
  for (let index = 0; index < Math.min(relevant.size, k); index += 1) {
    ideal += 1 / Math.log2(index + 2)
  }
  return dcg / ideal
}

export function mean(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length
}
