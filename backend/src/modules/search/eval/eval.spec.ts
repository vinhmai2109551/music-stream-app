import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "@jest/globals"
import { parseEvalQueries, QUERY_KINDS, type EvalQuery } from "./queries.js"
import { renderReport } from "./report.js"
import {
  evaluate,
  EVAL_K,
  MODES,
  scoreQuery,
  summarize,
  type SearchFn,
  type SearchMode,
} from "./run-eval.js"

const query = (id: string, relevant: string[], kind: EvalQuery["kind"] = "mood"): EvalQuery => ({
  id,
  kind,
  q: `question ${id}`,
  relevant,
})

describe("parseEvalQueries", () => {
  const valid = {
    queries: [{ id: "a", kind: "title", q: "  lạc trôi ", relevant: ["t1"], note: "n" }],
  }

  it("reads a good file and trims the question", () => {
    expect(parseEvalQueries(valid)).toEqual([
      { id: "a", kind: "title", q: "lạc trôi", relevant: ["t1"], note: "n" },
    ])
  })

  it.each([
    ["not an object", []],
    ["no queries list", { queries: {} }],
    ["a query that is not an object", { queries: [1] }],
    ["no id", { queries: [{ kind: "title", q: "x", relevant: ["t"] }] }],
    ["an unknown kind", { queries: [{ id: "a", kind: "lyrics", q: "x", relevant: ["t"] }] }],
    ["a blank question", { queries: [{ id: "a", kind: "title", q: "  ", relevant: ["t"] }] }],
    ["no relevant track", { queries: [{ id: "a", kind: "title", q: "x", relevant: [] }] }],
    [
      "a relevant id that is not text",
      { queries: [{ id: "a", kind: "title", q: "x", relevant: [1] }] },
    ],
    [
      "a track listed twice",
      { queries: [{ id: "a", kind: "title", q: "x", relevant: ["t", "t"] }] },
    ],
    [
      "a note that is not text",
      { queries: [{ id: "a", kind: "title", q: "x", relevant: ["t"], note: 1 }] },
    ],
    [
      "an id used twice",
      {
        queries: [
          { id: "a", kind: "title", q: "x", relevant: ["t"] },
          { id: "a", kind: "title", q: "y", relevant: ["t"] },
        ],
      },
    ],
  ])("refuses %s", (_name, raw) => {
    expect(() => parseEvalQueries(raw)).toThrow()
  })
})

describe("backend/eval/search-queries.json", () => {
  const raw: unknown = JSON.parse(
    readFileSync(path.join(process.cwd(), "eval", "search-queries.json"), "utf8"),
  )
  const queries = parseEvalQueries(raw)
  const catalog = (
    JSON.parse(
      readFileSync(path.join(process.cwd(), "src", "seed", "catalog", "metadata.json"), "utf8"),
    ) as { tracks: Record<string, unknown> }
  ).tracks

  it("is valid and has about thirty queries", () => {
    expect(queries.length).toBeGreaterThanOrEqual(30)
    expect(queries.length).toBeLessThanOrEqual(40)
  })

  it("only names tracks that are in the catalog", () => {
    const unknown = queries.flatMap((entry) => entry.relevant.filter((id) => !(id in catalog)))
    expect(unknown).toEqual([])
  })

  it("mixes Vietnamese and English, and every kind of query", () => {
    const english = queries.filter((entry) => /^[\x20-\x7e]+$/.test(entry.q) && /\s/.test(entry.q))
    const vietnamese = queries.filter((entry) =>
      /[ạảãàáâậầấẩẫăắằặẳẵêếềệểễôốồộổỗơớờợởỡưứừựửữđ]/i.test(entry.q),
    )
    expect(vietnamese.length).toBeGreaterThanOrEqual(10)
    expect(english.length).toBeGreaterThanOrEqual(5)
    expect(new Set(queries.map((entry) => entry.kind))).toEqual(new Set(QUERY_KINDS))
  })

  it("has a title or an artist query typed without accents", () => {
    expect(queries.some((entry) => entry.id === "title-see-tinh")).toBe(true)
    expect(queries.some((entry) => entry.id === "artist-son-tung")).toBe(true)
  })

  it("asks for no lyrics", () => {
    expect(queries.some((entry) => /lyric|lời bài hát|lời nhạc/i.test(entry.q))).toBe(false)
  })
})

describe("scoreQuery", () => {
  it("scores a ranking against the relevant tracks", () => {
    const score = scoreQuery(query("a", ["t1", "t2"]), ["x", "t1", "y", "t2"])

    expect(score.recall).toBe(1)
    expect(score.reciprocalRank).toBe(1 / 2)
    expect(score.firstRelevant).toBe(2)
    expect(score.ndcg).toBeGreaterThan(0)
    expect(score.ndcg).toBeLessThan(1)
  })

  it("keeps only the first k results", () => {
    const ranked = [...Array.from({ length: EVAL_K }, (_, i) => `x${i}`), "t1"]
    const score = scoreQuery(query("a", ["t1"]), ranked)

    expect(score.ranked).toHaveLength(EVAL_K)
    expect(score.recall).toBe(0)
    expect(score.firstRelevant).toBeNull()
  })
})

describe("evaluate", () => {
  const queries = [query("a", ["t1"]), query("b", ["t2"], "title")]

  const none: Record<SearchMode, string[]> = { keyword: [], vector: [], hybrid: [] }

  /** keyword finds the answer first, vector never does, hybrid second. */
  const search: SearchFn = async (q) => {
    const answer = q.endsWith("a") ? "t1" : "t2"
    return { keyword: [answer, "x"], vector: ["x", "y"], hybrid: ["x", answer] }
  }

  it("searches each query once, in the order of the file (not once per mode)", async () => {
    const calls: string[] = []
    await evaluate(queries, async (q) => {
      calls.push(q)
      return none
    })

    expect(calls).toEqual(["question a", "question b"])
  })

  it("asks for k results", async () => {
    const limits: number[] = []
    await evaluate(queries, async (_q, limit) => {
      limits.push(limit)
      return none
    })
    expect(new Set(limits)).toEqual(new Set([EVAL_K]))
  })

  it("scores each mode and summarizes it", async () => {
    const results = await evaluate(queries, search)

    expect(summarize(results.keyword)).toEqual({ recall: 1, mrr: 1, ndcg: 1 })
    expect(summarize(results.vector)).toEqual({ recall: 0, mrr: 0, ndcg: 0 })
    expect(summarize(results.hybrid).mrr).toBe(0.5)
  })

  it("a failing search stops the evaluation instead of scoring half of it", async () => {
    await expect(
      evaluate(queries, async () => {
        throw new Error("embedding service down")
      }),
    ).rejects.toThrow("embedding service down")
  })
})

describe("renderReport", () => {
  const context = {
    generatedAt: new Date("2026-11-08T10:00:00Z"),
    model: "gemini-embedding-2",
    tracks: 115,
    tracksWithVectors: 115,
    queriesFile: "eval/search-queries.json",
  }
  const search: SearchFn = async (q) =>
    q.includes("weak")
      ? { keyword: ["t1"], vector: ["x"], hybrid: ["x", "t1"] }
      : { keyword: ["x"], vector: ["t2", "x"], hybrid: ["x"] }
  const queries = [query("a", ["t2"]), { ...query("w", ["t1"], "title"), q: "weak | query" }]

  it("has the three searches, the three metrics and the setup", async () => {
    const text = renderReport(await evaluate(queries, search), context)

    expect(text).toContain("# Search evaluation")
    expect(text).toContain("- Date: 2026-11-08")
    expect(text).toContain("`gemini-embedding-2`")
    expect(text).toContain("115 tracks, 115 with a vector")
    for (const heading of ["Recall@10", "MRR@10", "nDCG@10"]) expect(text).toContain(heading)
    for (const name of ["Keyword only", "Vector only", "Hybrid (RRF)"]) expect(text).toContain(name)
    for (const mode of MODES) expect(text.length).toBeGreaterThan(mode.length)
  })

  it("lists every query, with a '|' in a question escaped", async () => {
    const text = renderReport(await evaluate(queries, search), context)

    expect(text).toContain("question a")
    expect(text).toContain("weak \\| query")
  })

  it("names the queries where hybrid is worse than the better list", async () => {
    const text = renderReport(await evaluate(queries, search), context)

    expect(text).toMatch(/## Where hybrid is worse[\s\S]*`weak \| query`: hybrid/)
  })

  it("says so when there are none", async () => {
    const same: SearchFn = async () => ({ keyword: ["t2"], vector: ["t2"], hybrid: ["t2"] })
    const text = renderReport(await evaluate([query("a", ["t2"])], same), context)

    expect(text).toContain("None (within 0.05 nDCG).")
  })

  it("puts a warning on top when the numbers cannot be trusted", async () => {
    const results = await evaluate(queries, search)
    const text = renderReport(results, {
      ...context,
      warnings: [
        "the vectors are made by the offline stand-in",
        "only 40 of 115 tracks have a vector",
      ],
    })

    expect(text).toContain(
      "> **Do not quote these numbers:** the vectors are made by the offline stand-in",
    )
    expect(text).toContain("> **Do not quote these numbers:** only 40 of 115 tracks have a vector")
    expect(text.indexOf("Do not quote")).toBeLessThan(text.indexOf("## Summary"))
    expect(renderReport(results, context)).not.toContain("Do not quote")
  })

  it("gives the same text for the same results", async () => {
    const results = await evaluate(queries, search)
    expect(renderReport(results, context)).toBe(renderReport(results, context))
  })

  it("has a row in the table for every kind that was asked", async () => {
    const text = renderReport(await evaluate(queries, search), context)

    expect(text).toMatch(/\| mood \| 1 \|/)
    expect(text).toMatch(/\| title \| 1 \|/)
    expect(text).not.toMatch(/\| artist \| 0 \|/)
  })

  it("warns that the labels and the vectors share their source", async () => {
    const text = renderReport(await evaluate(queries, search), context)
    expect(text).toContain("also the text the vectors are made from")
  })
})
