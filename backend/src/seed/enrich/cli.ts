import "dotenv/config"
import { writeFileSync } from "node:fs"
import { GeminiInteractionsClient } from "../../shared/llm/gemini-interactions.client.js"
import { readLlmConfig } from "../../shared/llm/llm-config.js"
import { CATALOG_ARTISTS, CATALOG_TRACKS } from "../catalog/index.js"
import { CATALOG_METADATA } from "../catalog/load-metadata.js"
import { parseCatalogMetadata } from "../catalog/metadata.js"
import { enrichModelOf } from "./enrich-model.js"
import { enrichCatalog, formatMetadata } from "./enrich.js"

const OUTPUT = new URL("../catalog/metadata.json", import.meta.url)

function readArguments(argv: readonly string[]) {
  const limit = argv.find((arg) => arg.startsWith("--limit="))?.slice("--limit=".length)
  return { force: argv.includes("--force"), limit: limit ? Number(limit) : undefined }
}

async function main() {
  const config = readLlmConfig((key) => process.env[key])
  if (!config.apiKey) {
    console.error(
      "No Gemini key: set GEMINI_API_KEY (or EMBEDDING_API_KEY) in backend/.env and run again.",
    )
    process.exitCode = 1
    return
  }
  const { force, limit } = readArguments(process.argv.slice(2))
  console.log(`Model: ${config.model}${force ? " (--force: redoing every entry)" : ""}`)

  const client = new GeminiInteractionsClient({
    apiKey: config.apiKey,
    model: config.model,
    thinkingLevel: config.thinkingLevel,
  })
  const artistName = new Map(CATALOG_ARTISTS.map((artist) => [artist.id, artist.name]))
  const result = await enrichCatalog({
    model: enrichModelOf(client),
    tracks: CATALOG_TRACKS.map((track) => ({
      id: track.id,
      title: track.title,
      artist: artistName.get(track.artistId) ?? track.artistId,
      region: CATALOG_ARTISTS.find((artist) => artist.id === track.artistId)?.region ?? "GLOBAL",
    })),
    artists: CATALOG_ARTISTS.map((artist) => ({
      id: artist.id,
      name: artist.name,
      region: artist.region,
      bio: artist.bio,
    })),
    existing: CATALOG_METADATA,
    force,
    limit,
    log: console.log,
  })

  // The same checks the seed runs, so a file written here always loads.
  const text = formatMetadata(parseCatalogMetadata(result.metadata))
  writeFileSync(OUTPUT, text)

  console.log(`\nWrote ${OUTPUT.pathname}`)
  console.log(`  proposed: ${result.addedTracks} tracks, ${result.addedArtists} artists`)
  if (result.lowConfidence.length > 0) {
    console.log(
      `  the model was GUESSING for ${result.lowConfidence.length} tracks - review these first:`,
    )
    console.log(`    ${result.lowConfidence.join(", ")}`)
  }
  if (result.descriptionDropped.length > 0) {
    console.log(
      `  descriptions removed because they looked like quoted lyrics (write them by hand):`,
    )
    console.log(`    ${result.descriptionDropped.join(", ")}`)
  }
  if (result.missing.length > 0) {
    console.log(`  no usable answer for ${result.missing.length} ids - run the command again:`)
    console.log(`    ${result.missing.join(", ")}`)
  }
  console.log("\nThis file is a PROPOSAL: read it, fix what is wrong, then run the seed.")
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
