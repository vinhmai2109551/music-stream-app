import * as background from "./background.js"
import * as china from "./china.js"
import * as japan from "./japan.js"
import * as korea from "./korea.js"
import { pictureVideoOf, videoPicture } from "./pictures.js"
import type { SeedAlbum, SeedArtist } from "./shared.js"
import * as vietnam from "./vietnam.js"

export { background, china, japan, korea, vietnam }
export { pictureVideoOf, videoPicture }
export type { CatalogRegion, MediaRef, Region, SeedAlbum, SeedArtist, SeedTrack } from "./shared.js"

export const CATALOG_TRACKS = [
  ...vietnam.TRACKS,
  ...korea.TRACKS,
  ...japan.TRACKS,
  ...china.TRACKS,
  ...background.TRACKS,
]

const tracksOfArtist = (artistId: string) =>
  CATALOG_TRACKS.filter((track) => track.artistId === artistId)

/** An artist shows the picture of the video of their most played song (when they have a video). */
export const CATALOG_ARTISTS: SeedArtist[] = [
  ...vietnam.ARTISTS,
  ...korea.ARTISTS,
  ...japan.ARTISTS,
  ...china.ARTISTS,
  ...background.ARTISTS,
].map((artist) => {
  const video = pictureVideoOf(tracksOfArtist(artist.id))
  return video ? { ...artist, image: { url: videoPicture(video) } } : artist
})

/** An album shows the next picture of its artist, so it differs from the artist's own picture. */
export const CATALOG_ALBUMS: SeedAlbum[] = [
  ...vietnam.ALBUMS,
  ...korea.ALBUMS,
  ...japan.ALBUMS,
  ...china.ALBUMS,
].map((album) => {
  const video = pictureVideoOf(tracksOfArtist(album.artistId), 1)
  return video ? { ...album, cover: { url: videoPicture(video) } } : album
})
