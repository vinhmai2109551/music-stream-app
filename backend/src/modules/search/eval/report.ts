import { QUERY_KINDS } from "./queries.js"
import { EVAL_K, MODES, summarize, type EvalResults, type SearchMode } from "./run-eval.js"

export interface ReportContext {
  generatedAt: Date
  /** Name of the embedding model, as stored with the vectors. */
  model: string
  tracks: number
  tracksWithVectors: number
  /** Where the queries were read from, as shown to the reader. */
  queriesFile: string
  /** Reasons not to trust the numbers (the offline provider, vectors missing); shown on top. */
  warnings?: string[]
}

const LABEL: Record<SearchMode, string> = {
  keyword: "Keyword only",
  vector: "Vector only",
  hybrid: "Hybrid (RRF)",
}

/** A hybrid result this much worse than the better of the two lists is listed as a weak spot. */
const WEAK_MARGIN = 0.05

const score = (value: number) => value.toFixed(3)
const cell = (text: string) => text.replace(/\|/g, "\\|")
const table = (head: string[], rows: string[][]) =>
  [
    `| ${head.join(" | ")} |`,
    `| ${head.map((_, index) => (index === 0 ? "---" : "---:")).join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`),
  ].join("\n")

/** The Markdown of `eval/results.md`: the same results always give the same text. */
export function renderReport(results: EvalResults, context: ReportContext): string {
  const total = results.hybrid.length
  const k = EVAL_K

  const summary = table(
    ["Search", `Recall@${k}`, `MRR@${k}`, `nDCG@${k}`],
    MODES.map((mode) => {
      const s = summarize(results[mode])
      return [LABEL[mode], score(s.recall), score(s.mrr), score(s.ndcg)]
    }),
  )

  const byKind = table(
    ["Kind of query", "Queries", ...MODES.map((mode) => `${LABEL[mode]} nDCG@${k}`)],
    QUERY_KINDS.flatMap((kind) => {
      const count = results.hybrid.filter((entry) => entry.query.kind === kind).length
      if (count === 0) return []
      return [
        [
          kind,
          String(count),
          ...MODES.map((mode) =>
            score(summarize(results[mode].filter((entry) => entry.query.kind === kind)).ndcg),
          ),
        ],
      ]
    }),
  )

  const byQuery = table(
    [
      "Query",
      "Kind",
      "Relevant",
      ...MODES.map((mode) => `${LABEL[mode]} nDCG`),
      "First hit (K / V / H)",
    ],
    results.hybrid.map((hybrid, index) => {
      const rank = (mode: SearchMode) => String(results[mode][index].firstRelevant ?? "-")
      return [
        cell(hybrid.query.q),
        hybrid.query.kind,
        String(hybrid.query.relevant.length),
        ...MODES.map((mode) => score(results[mode][index].ndcg)),
        MODES.map(rank).join(" / "),
      ]
    }),
  )

  const weak = results.hybrid.flatMap((hybrid, index) => {
    const best = Math.max(results.keyword[index].ndcg, results.vector[index].ndcg)
    return hybrid.ndcg < best - WEAK_MARGIN
      ? [`- \`${hybrid.query.q}\`: hybrid ${score(hybrid.ndcg)}, best single list ${score(best)}`]
      : []
  })

  return [
    "# Search evaluation",
    "",
    "Made by `npm run ai:eval`. Do not edit by hand: run it again.",
    "",
    ...(context.warnings ?? []).flatMap((warning) => [
      `> **Do not quote these numbers:** ${warning}`,
      "",
    ]),
    `- Date: ${context.generatedAt.toISOString().slice(0, 10)}`,
    `- Embedding model: \`${context.model}\``,
    `- Catalog: ${context.tracks} tracks, ${context.tracksWithVectors} with a vector`,
    `- Queries: ${total} from \`${context.queriesFile}\`, top ${k} of each search`,
    "",
    "## Summary",
    "",
    summary,
    "",
    "Averages over all queries. **Keyword only** is the search by words (accents and case ignored); **vector only** is the nearest tracks by meaning; **hybrid** merges the two with Reciprocal Rank Fusion, as `GET /api/search/semantic` does.",
    "",
    "## By kind of query",
    "",
    byKind,
    "",
    "## By query",
    "",
    byQuery,
    "",
    "## Where hybrid is worse than the better single list",
    "",
    weak.length > 0 ? weak.join("\n") : "None (within 0.05 nDCG).",
    "",
    "## How to read this",
    "",
    `- **Recall@${k}**: the share of the relevant tracks that are in the first ${k}. A query with more than ${k} relevant tracks cannot reach 1.`,
    `- **MRR@${k}**: 1 / the position of the first relevant track (0 if there is none in the first ${k}), averaged.`,
    `- **nDCG@${k}**: rewards relevant tracks near the top; 1 is the ideal order.`,
    "- The relevant tracks were chosen by a person from the title, the artist, the language and the region of each song, and from the catalog metadata. That metadata is also the text the vectors are made from, so mood and occasion queries favour the vector search a little; title and artist queries do not.",
    `- ${total} queries are enough to compare the three searches, not to tell a 0.02 difference from noise.`,
    "",
  ].join("\n")
}
