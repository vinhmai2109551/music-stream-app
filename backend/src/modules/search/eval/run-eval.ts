import { mean, ndcgAtK, recallAtK, reciprocalRank } from "./metrics.js"
import type { EvalQuery } from "./queries.js"

/** The three ways of searching that are compared. */
export const MODES = ["keyword", "vector", "hybrid"] as const
export type SearchMode = (typeof MODES)[number]

/** Results shown for each query, and the depth of Recall and nDCG. */
export const EVAL_K = 10

export interface QueryScore {
  query: EvalQuery
  /** The ids returned, best first. */
  ranked: string[]
  recall: number
  reciprocalRank: number
  ndcg: number
  /** 1-based position of the first relevant result, or null. */
  firstRelevant: number | null
}

export interface ModeSummary {
  recall: number
  mrr: number
  ndcg: number
}

export type EvalResults = Record<SearchMode, QueryScore[]>

/** Searches `q` and returns, for each mode, the track ids found, best first. */
export type SearchFn = (q: string, limit: number) => Promise<Record<SearchMode, string[]>>

export function scoreQuery(query: EvalQuery, ranked: readonly string[], k = EVAL_K): QueryScore {
  const relevant = new Set(query.relevant)
  const top = ranked.slice(0, k)
  const index = top.findIndex((id) => relevant.has(id))
  return {
    query,
    ranked: [...top],
    recall: recallAtK(top, relevant, k),
    reciprocalRank: reciprocalRank(top, relevant),
    ndcg: ndcgAtK(top, relevant, k),
    firstRelevant: index === -1 ? null : index + 1,
  }
}

/** Runs the queries one at a time (the embedding service has rate limits). */
export async function evaluate(
  queries: readonly EvalQuery[],
  search: SearchFn,
  k = EVAL_K,
): Promise<EvalResults> {
  const results: EvalResults = { keyword: [], vector: [], hybrid: [] }
  for (const query of queries) {
    const lists = await search(query.q, k)
    for (const mode of MODES) results[mode].push(scoreQuery(query, lists[mode], k))
  }
  return results
}

export function summarize(scores: readonly QueryScore[]): ModeSummary {
  return {
    recall: mean(scores.map((score) => score.recall)),
    mrr: mean(scores.map((score) => score.reciprocalRank)),
    ndcg: mean(scores.map((score) => score.ndcg)),
  }
}
