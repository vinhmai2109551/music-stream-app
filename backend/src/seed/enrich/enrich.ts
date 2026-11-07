import type { CatalogMetadata } from "../catalog/metadata.js"
import {
  ARTIST_SCHEMA,
  buildArtistPrompt,
  buildTrackPrompt,
  ENRICH_SYSTEM_PROMPT,
  TRACK_SCHEMA,
  type EnrichArtistInput,
  type EnrichTrackInput,
} from "./enrich-prompt.js"
import {
  toArtistMetadata,
  toTrackSuggestion,
  type Confidence,
  type RawTrackSuggestion,
} from "./sanitize.js"

/** The model, as the enrichment needs it: one request in, the text of the answer out. */
export interface EnrichModel {
  complete(request: {
    system: string
    user: string
    schema: Record<string, unknown>
    maxTokens: number
  }): Promise<string>
}

export interface EnrichOptions {
  model: EnrichModel
  tracks: readonly EnrichTrackInput[]
  artists: readonly EnrichArtistInput[]
  /** The reviewed content so far. Its entries are kept unless `force` is set. */
  existing: CatalogMetadata
  /** Propose entries again for ids that already have one. */
  force?: boolean
  /** Stop after this many tracks (to try the script on a few). */
  limit?: number
  batchSize?: number
  log?: (message: string) => void
}

export interface EnrichResult {
  metadata: CatalogMetadata
  addedTracks: number
  addedArtists: number
  /** Ids of tracks the model was not sure about: look at these first. */
  lowConfidence: string[]
  /** Ids whose description was dropped for looking like a quoted lyric. */
  descriptionDropped: string[]
  /** Ids the model gave no usable answer for; run the script again to retry them. */
  missing: string[]
}

const DEFAULT_BATCH_SIZE = 15
const MAX_TOKENS = 8000
const ATTEMPTS = 2

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

/** The entries of `{ "items": [...] }` that belong to `ids`, by id (the first of an id wins). */
export function readItems(text: string, ids: ReadonlySet<string>): Map<string, RawTrackSuggestion> {
  const parsed: unknown = JSON.parse(text)
  if (!isRecord(parsed) || !Array.isArray(parsed.items)) {
    throw new Error("The answer is not { items: [...] }")
  }
  const found = new Map<string, RawTrackSuggestion>()
  for (const item of parsed.items) {
    if (isRecord(item) && typeof item.id === "string" && ids.has(item.id) && !found.has(item.id)) {
      found.set(item.id, item)
    }
  }
  return found
}

const chunk = <T>(items: readonly T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size),
  )

/** Asks for one batch; tries twice because a model sometimes returns an unusable answer. */
async function askBatch(
  model: EnrichModel,
  request: { user: string; schema: Record<string, unknown> },
  ids: ReadonlySet<string>,
  log: (message: string) => void,
): Promise<Map<string, RawTrackSuggestion>> {
  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    try {
      const text = await model.complete({
        system: ENRICH_SYSTEM_PROMPT,
        maxTokens: MAX_TOKENS,
        ...request,
      })
      return readItems(text, ids)
    } catch (error) {
      log(`  attempt ${attempt} failed: ${(error as Error).message}`)
    }
  }
  return new Map()
}

/**
 * Proposes metadata for the tracks and artists of the catalog that have none yet (or all of them
 * with `force`). Never changes an entry it was not asked to redo. The result is a PROPOSAL: it
 * goes to `metadata.json` for a person to review.
 */
export async function enrichCatalog(options: EnrichOptions): Promise<EnrichResult> {
  const { model, existing, force = false, batchSize = DEFAULT_BATCH_SIZE } = options
  const log = options.log ?? (() => undefined)
  const metadata: CatalogMetadata = {
    tracks: { ...existing.tracks },
    artists: { ...existing.artists },
  }
  const lowConfidence: string[] = []
  const descriptionDropped: string[] = []
  const missing: string[] = []
  let addedTracks = 0
  let addedArtists = 0

  const todoTracks = options.tracks
    .filter((track) => force || !(track.id in existing.tracks))
    .slice(0, options.limit ?? Number.POSITIVE_INFINITY)
  const todoArtists = options.artists.filter((artist) => force || !(artist.id in existing.artists))

  for (const [index, batch] of chunk(todoTracks, batchSize).entries()) {
    log(`Tracks, batch ${index + 1} of ${Math.ceil(todoTracks.length / batchSize)}`)
    const ids = new Set(batch.map((track) => track.id))
    const answers = await askBatch(
      model,
      { user: buildTrackPrompt(batch), schema: TRACK_SCHEMA },
      ids,
      log,
    )
    for (const track of batch) {
      const raw = answers.get(track.id)
      if (!raw) {
        missing.push(track.id)
        continue
      }
      const suggestion = toTrackSuggestion(raw)
      metadata.tracks[track.id] = suggestion.metadata
      addedTracks += 1
      const confidence: Confidence = suggestion.confidence
      if (confidence === "low") lowConfidence.push(track.id)
      if (suggestion.descriptionDropped) descriptionDropped.push(track.id)
    }
  }

  for (const [index, batch] of chunk(todoArtists, batchSize).entries()) {
    log(`Artists, batch ${index + 1} of ${Math.ceil(todoArtists.length / batchSize)}`)
    const ids = new Set(batch.map((artist) => artist.id))
    const answers = await askBatch(
      model,
      { user: buildArtistPrompt(batch), schema: ARTIST_SCHEMA },
      ids,
      log,
    )
    for (const artist of batch) {
      const raw = answers.get(artist.id)
      if (!raw) {
        missing.push(artist.id)
        continue
      }
      metadata.artists[artist.id] = toArtistMetadata(raw)
      addedArtists += 1
    }
  }

  return { metadata, addedTracks, addedArtists, lowConfidence, descriptionDropped, missing }
}

/** The metadata file as text: ids in order, two-space indent, a final newline. */
export function formatMetadata(metadata: CatalogMetadata): string {
  const sorted = <T>(record: Record<string, T>) =>
    Object.fromEntries(Object.entries(record).sort(([a], [b]) => a.localeCompare(b)))
  return `${JSON.stringify({ tracks: sorted(metadata.tracks), artists: sorted(metadata.artists) }, null, 2)}\n`
}
