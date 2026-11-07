import {
  DESCRIPTION_MAX_LENGTH,
  LANGUAGE_CODE,
  LIST_ITEM_MAX_LENGTH,
  LIST_MAX_ITEMS,
} from "../../shared/validation/limits.js"

/** What the seed knows about a track beyond its title: no lyrics, only what it is like. */
export interface TrackMetadata {
  genres: string[]
  mood: string[]
  tags: string[]
  description: string
  /** ISO 639 code of the vocals; null = instrumental or unknown. */
  language: string | null
}

export interface ArtistMetadata {
  genres: string[]
}

/** The reviewed content of `metadata.json`: entries by track id and by artist id. */
export interface CatalogMetadata {
  tracks: Record<string, TrackMetadata>
  artists: Record<string, ArtistMetadata>
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

/** A list of short non-empty words, as the admin API takes it. */
function readList(value: unknown, where: string): string[] {
  if (!Array.isArray(value)) throw new Error(`${where} must be a list`)
  if (value.length > LIST_MAX_ITEMS) {
    throw new Error(`${where} has ${value.length} entries; at most ${LIST_MAX_ITEMS}`)
  }
  return value.map((entry, index) => {
    if (typeof entry !== "string" || !entry.trim()) {
      throw new Error(`${where}[${index}] must be a non-empty text`)
    }
    if (entry.length > LIST_ITEM_MAX_LENGTH) {
      throw new Error(`${where}[${index}] is longer than ${LIST_ITEM_MAX_LENGTH} characters`)
    }
    return entry
  })
}

function readTrack(value: unknown, id: string): TrackMetadata {
  const where = `tracks.${id}`
  if (!isRecord(value)) throw new Error(`${where} must be an object`)
  const { description, language } = value
  if (typeof description !== "string") throw new Error(`${where}.description must be a text`)
  if (description.length > DESCRIPTION_MAX_LENGTH) {
    throw new Error(`${where}.description is longer than ${DESCRIPTION_MAX_LENGTH} characters`)
  }
  if (language !== null && (typeof language !== "string" || !LANGUAGE_CODE.test(language))) {
    throw new Error(`${where}.language must be null or a 2-3 letter lower case language code`)
  }
  return {
    genres: readList(value.genres, `${where}.genres`),
    mood: readList(value.mood, `${where}.mood`),
    tags: readList(value.tags, `${where}.tags`),
    description,
    language,
  }
}

/**
 * Checks the content of `metadata.json` and returns it typed. Throws with the path of the first
 * problem, so a bad edit is found when the seed or the tests run and not by a user.
 */
export function parseCatalogMetadata(raw: unknown): CatalogMetadata {
  if (!isRecord(raw) || !isRecord(raw.tracks) || !isRecord(raw.artists)) {
    throw new Error('metadata.json must look like { "tracks": {...}, "artists": {...} }')
  }
  const tracks: Record<string, TrackMetadata> = {}
  for (const [id, value] of Object.entries(raw.tracks)) tracks[id] = readTrack(value, id)

  const artists: Record<string, ArtistMetadata> = {}
  for (const [id, value] of Object.entries(raw.artists)) {
    if (!isRecord(value)) throw new Error(`artists.${id} must be an object`)
    artists[id] = { genres: readList(value.genres, `artists.${id}.genres`) }
  }
  return { tracks, artists }
}
