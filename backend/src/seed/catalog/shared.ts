import { videoPicture } from "./pictures.js"
import { YOUTUBE_VIDEO_IDS } from "./youtube-ids.js"

/**
 * Types and helpers shared by `seed-data.ts` and the regional catalog files.
 * They live here (not in `seed-data.ts`) so the catalog files do not import `seed-data.ts`,
 * which would create an import cycle.
 */
/** A file in the bucket (`folder/file`), or a picture that lives elsewhere (`url`). */
export type MediaRef =
  { folder: "audio" | "covers" | "artists" | "banners"; file: string } | { url: string }

/** Where an artist comes from. `GLOBAL` is the original mock data. */
export type Region = "VIETNAM" | "KOREA" | "JAPAN" | "CHINA" | "GLOBAL"

/** Regions that have a catalog file. */
export type CatalogRegion = Exclude<Region, "GLOBAL">

export const cover = (file: string): MediaRef => ({ folder: "covers", file })
export const artistImage = (file: string): MediaRef => ({ folder: "artists", file })
export const audio = (id: string): MediaRef => ({ folder: "audio", file: `${id}.mp3` })

export interface SeedArtist {
  id: string
  name: string
  region: Region
  baseFollowers: number
  image: MediaRef
  bio: string
}

export interface SeedTrack {
  id: string
  title: string
  artistId: string
  cover: MediaRef
  plays: number
  durationSec: number
  /** Audio file in the bucket; only the original demo tracks have one (the rest are commercial). */
  audio?: MediaRef
  /** Id of the official YouTube video this track plays from (see youtube-ids.ts). */
  youtubeVideoId?: string
}

export interface SeedAlbum {
  id: string
  title: string
  artistId: string
  cover: MediaRef
  trackIds: readonly string[]
}

/** An artist with at least this many tracks gets a "<name> Hits" album. */
const MIN_TRACKS_FOR_ALBUM = 4

/** Image: `artists/<id>.jpg`. */
export function createArtist(
  region: CatalogRegion,
  id: string,
  name: string,
  baseFollowers: number,
  bio: string,
): SeedArtist {
  return { id, name, region, baseFollowers, image: artistImage(`${id}.jpg`), bio }
}

/**
 * Id: `<artistId>-<slug>`. Cover: `covers/<region>/<id>.jpg`. No audio file: these are commercial
 * recordings that play only through the official YouTube video.
 * The YouTube video comes from the verified list in youtube-ids.ts.
 */
export function createTrack(
  region: CatalogRegion,
  artistId: string,
  slug: string,
  title: string,
  plays: number,
  durationSec: number,
): SeedTrack {
  const id = `${artistId}-${slug}`
  const youtubeVideoId = YOUTUBE_VIDEO_IDS[id]
  return {
    id,
    title,
    artistId,
    // A song with an official video uses that video's picture; nothing has to be uploaded.
    cover: youtubeVideoId
      ? { url: videoPicture(youtubeVideoId) }
      : cover(`${region.toLowerCase()}/${id}.jpg`),
    plays,
    durationSec,
    ...(youtubeVideoId ? { youtubeVideoId } : {}),
  }
}

/** One album per artist with enough tracks: id `<artistId>-hits`, cover `covers/albums/<id>.jpg`. */
export function createHitsAlbums(
  artists: readonly SeedArtist[],
  tracks: readonly SeedTrack[],
): SeedAlbum[] {
  return artists.flatMap((artist) => {
    const trackIds = tracks.filter((track) => track.artistId === artist.id).map((track) => track.id)
    if (trackIds.length < MIN_TRACKS_FOR_ALBUM) return []
    const id = `${artist.id}-hits`
    return [
      {
        id,
        title: `${artist.name} Hits`,
        artistId: artist.id,
        cover: cover(`albums/${id}.jpg`),
        trackIds,
      },
    ]
  })
}
