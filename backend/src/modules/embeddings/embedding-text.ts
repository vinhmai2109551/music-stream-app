import { createHash } from "node:crypto"

/** How a region is written in the text that gets embedded: users search in Vietnamese. */
const REGION_LABEL: Readonly<Record<string, string>> = {
  VIETNAM: "Việt Nam",
  KOREA: "Hàn Quốc",
  JAPAN: "Nhật Bản",
  CHINA: "Trung Quốc",
  GLOBAL: "Quốc tế",
}

/** A bio is long and mostly facts; the first part says what the artist is. */
const BIO_MAX_LENGTH = 500

export interface TrackText {
  title: string
  artist: string
  region: string
  genres: readonly string[]
  mood: readonly string[]
  tags: readonly string[]
  description: string
}

export interface ArtistText {
  name: string
  region: string
  genres: readonly string[]
  bio: string
}

const clean = (text: string) => text.trim().replace(/\s+/g, " ")

const regionLabel = (region: string) => REGION_LABEL[region] ?? region

/** `Label: a, b` when the list has something in it; nothing otherwise (no empty labels in the text). */
const listPart = (label: string, words: readonly string[]) => {
  const items = words.map(clean).filter(Boolean)
  return items.length > 0 ? [`${label}: ${items.join(", ")}`] : []
}

const textPart = (label: string, text: string) => {
  const value = clean(text)
  return value ? [`${label}: ${value}`] : []
}

/**
 * The text that stands for a track in the vector space:
 * `Bài: … Nghệ sĩ: … Khu vực: … Thể loại: … Tâm trạng: … Tag: … Mô tả: …`.
 * Parts with nothing in them are left out. Changing this format changes every hash, so every
 * vector is made again on the next `ai:embed`.
 */
export function trackEmbeddingText(track: TrackText): string {
  const parts = [
    `Bài: ${clean(track.title)}`,
    `Nghệ sĩ: ${clean(track.artist)}`,
    `Khu vực: ${regionLabel(track.region)}`,
    ...listPart("Thể loại", track.genres),
    ...listPart("Tâm trạng", track.mood),
    ...listPart("Tag", track.tags),
    ...textPart("Mô tả", track.description),
  ]
  return `${parts.join(". ")}.`
}

/** The same for an artist: name, region, genres and the start of the bio. */
export function artistEmbeddingText(artist: ArtistText): string {
  const parts = [
    `Nghệ sĩ: ${clean(artist.name)}`,
    `Khu vực: ${regionLabel(artist.region)}`,
    ...listPart("Thể loại", artist.genres),
    ...textPart("Giới thiệu", clean(artist.bio).slice(0, BIO_MAX_LENGTH)),
  ]
  return `${parts.join(". ")}.`
}

/**
 * Identifies one vector: the text it was made from and the model that made it. When either
 * changes the hash changes, and only then is the vector made again.
 */
export function contentHash(text: string, model: string): string {
  return createHash("sha256").update(text).update("\u0000").update(model).digest("hex")
}
