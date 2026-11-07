import "dotenv/config"
import Anthropic from "@anthropic-ai/sdk"
import { writeFileSync } from "node:fs"
import { CATALOG_ARTISTS, CATALOG_TRACKS } from "../catalog/index.js"
import { CATALOG_METADATA } from "../catalog/load-metadata.js"
import { parseCatalogMetadata } from "../catalog/metadata.js"
import { enrichCatalog, formatMetadata, type EnrichModel } from "./enrich.js"

const DEFAULT_MODEL = "claude-haiku-5-5"
const OUTPUT = new URL("../catalog/metadata.json", import.meta.url)

/** The Claude API as `EnrichModel`: a request with a JSON schema in, the JSON text out. */
function claude(client: Anthropic, model: string): EnrichModel {
  return {
    async complete({ system, user, schema, maxTokens }) {
      const response = await client.messages.create({
        model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: user }],
        output_config: { format: { type: "json_schema", schema } },
      })
      if (response.stop_reason === "refusal") throw new Error("The model declined the request")
      if (response.stop_reason === "max_tokens") throw new Error("The answer was cut off")
      const block = response.content.find((item) => item.type === "text")
      if (!block || block.type !== "text") throw new Error("The answer has no text")
      return block.text
    },
  }
}

function readArguments(argv: readonly string[]) {
  const limit = argv.find((arg) => arg.startsWith("--limit="))?.slice("--limit=".length)
  return { force: argv.includes("--force"), limit: limit ? Number(limit) : undefined }
}

async function main() {
  const apiKey = process.env["ANTHROPIC_API_KEY"]?.trim()
  if (!apiKey) {
    console.error(
      "ANTHROPIC_API_KEY is not set in backend/.env: nothing to ask. Set it and run again.",
    )
    process.exitCode = 1
    return
  }
  const { force, limit } = readArguments(process.argv.slice(2))
  const modelName = process.env["AI_MODEL"]?.trim() || DEFAULT_MODEL
  console.log(`Model: ${modelName}${force ? " (--force: redoing every entry)" : ""}`)

  const artistName = new Map(CATALOG_ARTISTS.map((artist) => [artist.id, artist.name]))
  const result = await enrichCatalog({
    model: claude(new Anthropic({ apiKey }), modelName),
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
