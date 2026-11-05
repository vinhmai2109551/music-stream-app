import * as background from "./background.js"
import * as china from "./china.js"
import * as japan from "./japan.js"
import * as korea from "./korea.js"
import * as vietnam from "./vietnam.js"

export { background, china, japan, korea, vietnam }
export type { CatalogRegion, MediaRef, Region, SeedAlbum, SeedArtist, SeedTrack } from "./shared.js"

export const CATALOG_ARTISTS = [
  ...vietnam.ARTISTS,
  ...korea.ARTISTS,
  ...japan.ARTISTS,
  ...china.ARTISTS,
  ...background.ARTISTS,
]

export const CATALOG_TRACKS = [
  ...vietnam.TRACKS,
  ...korea.TRACKS,
  ...japan.TRACKS,
  ...china.TRACKS,
  ...background.TRACKS,
]

export const CATALOG_ALBUMS = [...vietnam.ALBUMS, ...korea.ALBUMS, ...japan.ALBUMS, ...china.ALBUMS]
