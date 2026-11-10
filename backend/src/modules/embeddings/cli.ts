import "reflect-metadata"
import { NestFactory } from "@nestjs/core"
import { AppModule } from "../../app.module.js"
import { EmbeddingIndexService, type BackfillProgress } from "./embedding-index.service.js"
import { EmbeddingsService } from "./embeddings.service.js"
import { KnowledgeIndexService } from "./knowledge-index.service.js"

const LABEL = { track: "tracks ", artist: "artists" } as const

function printProgress(progress: BackfillProgress) {
  const { kind, done, total, embedded, unchanged } = progress
  console.log(
    `${LABEL[kind]} ${String(done).padStart(String(total).length)}/${total}` +
      `  made ${embedded}, up to date ${unchanged}`,
  )
}

/**
 * `npm run ai:embed [-- --force]`: makes the vector of every artist and track that has none or
 * whose text changed, 64 at a time, waiting out rate limits. Safe to run again; it only does the
 * work that is left. `--force` makes every vector again.
 */
async function main() {
  const force = process.argv.includes("--force")
  // A context without an HTTP server: this is a one-off job, not the API.
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ["error", "warn"] })
  try {
    const embeddings = app.get(EmbeddingsService)
    if (!embeddings.enabled) {
      console.error(
        "No embedding provider is set. Put EMBEDDING_PROVIDER=gemini and EMBEDDING_API_KEY in backend/.env.",
      )
      process.exitCode = 1
      return
    }
    console.log(`Model: ${embeddings.model}${force ? " (--force: making every vector again)" : ""}`)
    const onRetry = (attempt: number, delayMs: number) =>
      console.log(
        `  the embedding service is busy, trying again in ${delayMs / 1000}s (try ${attempt})`,
      )
    const report = await app
      .get(EmbeddingIndexService)
      .backfill({ force, onProgress: printProgress, onRetry })
    console.log(
      `\nDone. Artists: ${report.artists.embedded} made, ${report.artists.unchanged} up to date.` +
        ` Tracks: ${report.tracks.embedded} made, ${report.tracks.unchanged} up to date.`,
    )
    // After the catalog, so a problem with the help texts cannot hide that the vectors are done.
    try {
      const help = await app.get(KnowledgeIndexService).sync({ force, onRetry })
      console.log(
        `Help texts: ${help.embedded} of ${help.chunks} chunks made (${help.files} files),` +
          ` ${help.unchanged} up to date, ${help.removed} removed.`,
      )
    } catch (error) {
      console.error(
        `Help texts were NOT indexed: ${error instanceof Error ? error.message : String(error)}`,
      )
      process.exitCode = 1
    }
  } finally {
    await app.close()
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
