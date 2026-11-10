import "reflect-metadata"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { ServiceUnavailableException } from "@nestjs/common"
import { NestFactory } from "@nestjs/core"
import { AppModule } from "../../../app.module.js"
import {
  EMBEDDING_STORE,
  EmbeddingsService,
  withBackoff,
  type EmbeddingStore,
} from "../../embeddings/index.js"
import { TracksService } from "../../tracks/index.js"
import { SearchService } from "../search.service.js"
import { loadEvalQueries } from "./queries.js"
import { renderReport } from "./report.js"
import { evaluate, MODES, summarize, EVAL_K } from "./run-eval.js"

/** The model of the offline stand-in: its numbers measure shared words, not meaning. */
const FAKE_MODEL = "hashing-v1"
const DEFAULT_QUERIES = path.join("eval", "search-queries.json")
const DEFAULT_OUT = path.join("eval", "results.md")

/** `--name value`, or the default; a flag with no value after it is a mistake, not a default. */
function option(name: string, fallback: string): string {
  const index = process.argv.indexOf(`--${name}`)
  if (index === -1) return fallback
  const value = process.argv[index + 1]
  if (!value || value.startsWith("--")) throw new Error(`--${name} needs a value`)
  return value
}

const RETRY_ATTEMPTS = 5
const RETRY_BASE_DELAY_MS = 1000

function fail(message: string): void {
  console.error(message)
  process.exitCode = 1
}

/**
 * `npm run ai:eval [-- --queries file --out file --allow-fake --allow-partial]`: runs the queries
 * of `eval/search-queries.json` through the search by words, the search by meaning and the two
 * merged, prints Recall@10, MRR and nDCG@10, and writes `eval/results.md`.
 */
async function main() {
  const queriesFile = option("queries", DEFAULT_QUERIES)
  const outFile = option("out", DEFAULT_OUT)
  const queries = await loadEvalQueries(queriesFile)

  // A context without an HTTP server: this is a one-off job, not the API.
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ["error", "warn"] })
  try {
    const embeddings = app.get(EmbeddingsService)
    if (!embeddings.enabled || !embeddings.model) {
      return fail(
        "No embedding provider is set. Put EMBEDDING_PROVIDER=gemini and EMBEDDING_API_KEY in backend/.env.",
      )
    }
    if (embeddings.model === FAKE_MODEL && !process.argv.includes("--allow-fake")) {
      return fail(
        `The provider is the offline stand-in (${FAKE_MODEL}): its vectors only know shared words, so the numbers would say nothing about meaning. Use gemini, or add --allow-fake to run anyway.`,
      )
    }

    const tracks = app.get(TracksService)
    const store = app.get<EmbeddingStore>(EMBEDDING_STORE)
    const trackCount = await tracks.count()
    // Only vectors of the model that embeds the questions can be compared with them.
    const vectorCount = await store.count("track", embeddings.model)
    if (trackCount === 0) return fail("The catalog is empty. Run `npm run prisma:seed` first.")
    if (vectorCount === 0) {
      return fail(
        `No track has a vector made by ${embeddings.model}. Run \`npm run ai:embed\` first.`,
      )
    }
    const partial = vectorCount < trackCount
    if (partial && !process.argv.includes("--allow-partial")) {
      return fail(
        `Only ${vectorCount} of ${trackCount} tracks have a vector made by ${embeddings.model}. Run \`npm run ai:embed\` first (or add --allow-partial).`,
      )
    }

    const wanted = [...new Set(queries.flatMap((query) => query.relevant))]
    const found = new Set((await tracks.getByIds(wanted)).map((track) => track.id))
    const missing = wanted.filter((id) => !found.has(id))
    if (missing.length > 0) {
      return fail(
        `${missing.length} relevant track(s) are not in the database: ${missing.join(", ")}. Seed the catalog, or fix ${queriesFile}.`,
      )
    }

    const search = app.get(SearchService)
    console.log(`Model: ${embeddings.model}. ${queries.length} queries, 3 searches each.`)
    const results = await evaluate(queries, (q, limit) =>
      // A rate limit in the middle of the run is waited out, not allowed to lose the run.
      withBackoff(() => search.trackLists(q, limit), {
        attempts: RETRY_ATTEMPTS,
        baseDelayMs: RETRY_BASE_DELAY_MS,
        shouldRetry: (error) => error instanceof ServiceUnavailableException,
        onRetry: (_error, attempt, delayMs) =>
          console.log(
            `  the embedding service is busy, trying again in ${delayMs / 1000}s (try ${attempt})`,
          ),
      }),
    )

    for (const mode of MODES) {
      const s = summarize(results[mode])
      console.log(
        `${mode.padEnd(8)} Recall@${EVAL_K} ${s.recall.toFixed(3)}  MRR ${s.mrr.toFixed(3)}  nDCG@${EVAL_K} ${s.ndcg.toFixed(3)}`,
      )
    }
    const warnings = [
      ...(embeddings.model === FAKE_MODEL
        ? ["the vectors are made by the offline stand-in, which only knows shared words"]
        : []),
      ...(partial ? [`only ${vectorCount} of ${trackCount} tracks have a vector`] : []),
    ]
    await mkdir(path.dirname(outFile), { recursive: true })
    await writeFile(
      outFile,
      renderReport(results, {
        generatedAt: new Date(),
        model: embeddings.model,
        tracks: trackCount,
        tracksWithVectors: vectorCount,
        queriesFile: queriesFile.split(path.sep).join("/"),
        warnings,
      }),
      "utf8",
    )
    console.log(`\nWrote ${outFile}`)
  } finally {
    await app.close()
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
