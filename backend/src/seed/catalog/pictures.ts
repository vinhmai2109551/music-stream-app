/**
 * Pictures of artists, albums and playlists that come from the official videos of their songs.
 *
 * The app already shows the picture YouTube makes of each video as the cover of a song. Using the
 * same pictures for the artist, the album and the playlist gives every one of them a real image
 * without hosting anything: there is nothing to upload to R2, and a video that disappears only
 * costs its picture (the app falls back to a coloured tile with initials).
 *
 * The two lists below were measured on 05/11/2026 over every video of the catalog.
 */

/** Videos that have no 1280 x 720 picture; they use the 320 x 180 one. */
const SMALL_PICTURE_ONLY = new Set([
  "DYptgVvkVLQ",
  "OvioeS1ZZ7o",
  "i0nd3NPJ4MI",
  "i0p1bmr0EmE",
  "j8U06veqxdU",
  "sHD_z90ZKV0",
  "tLQLa6lM3Us",
])

/** Videos whose picture has black bars above and below the image: avoided for artists and albums. */
const LETTERBOXED = new Set([
  "8x2NjwwHUbQ",
  "CuklIb9d3fI",
  "GtDRcXtDg-4",
  "Hlp8XD0R5qo",
  "MBdVXkSdhwU",
  "TQ8WlA2GXbk",
  "WMweEpGlu_U",
  "XsX3ATc3FbA",
  "dawrQnvwMTY",
  "gdZLi9oWNZg",
  "hN5MBlGv2Ac",
  "xEeFrLSkMm8",
])

/** Address of a video's picture: 1280 x 720 when it exists, otherwise 320 x 180. */
export const videoPicture = (videoId: string): string =>
  `https://i.ytimg.com/vi/${videoId}/${SMALL_PICTURE_ONLY.has(videoId) ? "mqdefault" : "hq720"}.jpg`

/**
 * The video whose picture stands for a group of tracks (an artist, an album, a playlist): the most
 * played ones first, skipping pictures with black bars unless no other is left. `skip` takes the
 * next one, so an artist and the album of that artist do not show the same picture.
 */
export function pictureVideoOf(
  tracks: readonly { plays: number; youtubeVideoId?: string | null }[],
  skip = 0,
): string | undefined {
  const videos = [...tracks]
    .sort((a, b) => b.plays - a.plays)
    .flatMap((track) => (track.youtubeVideoId ? [track.youtubeVideoId] : []))
  const clean = videos.filter((id) => !LETTERBOXED.has(id))
  const pool = clean.length > 0 ? clean : videos
  return pool[Math.min(skip, pool.length - 1)]
}
