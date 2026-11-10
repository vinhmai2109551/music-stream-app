import { artistImage, audio, cover, type SeedArtist, type SeedTrack } from "./shared.js"

/**
 * Tracks that may be hosted and played in the background: music published under a Creative
 * Commons licence that allows it (CC BY). Unlike the commercial catalog they have an audio file
 * in R2 and no YouTube video, so they keep playing with the screen off.
 *
 * Titles, licences and sources are in LICENSED_AUDIO.md, which also lists the files to upload.
 * `durationSec` is the length of the recording as listed on its Wikimedia Commons page; set it to
 * the real length of the file you upload.
 */
export const ARTIST_ID = "kevin-macleod"

export const ARTISTS: SeedArtist[] = [
  {
    id: ARTIST_ID,
    name: "Kevin MacLeod",
    region: "GLOBAL",
    baseFollowers: 0,
    image: artistImage(`${ARTIST_ID}.jpg`),
    bio: "American composer whose royalty-free music, published on incompetech.com under Creative Commons licences, is used in films, games and videos.",
  },
]

/** [slug, title, length in seconds] in playlist order. */
const LICENSED_TRACKS = [
  ["stratosphere", "Stratosphere", 62],
  ["ghost-dance", "Ghost Dance", 73],
  ["strength-of-the-titans", "Strength of the Titans", 62],
  ["sugar-plum-dark-mix", "Sugar Plum Dark Mix", 125],
  ["fork-and-spoon", "Fork and Spoon", 196],
  ["tea-roots", "Tea Roots", 280],
  ["dream-catcher", "Dream Catcher", 377],
  ["severe-tire-damage", "Severe Tire Damage", 412],
] as const

/** Id: `kevin-macleod-<slug>`. Cover: `covers/background/<id>.jpg`. Audio: `audio/<id>.mp3`. */
export const TRACKS: SeedTrack[] = LICENSED_TRACKS.map(([slug, title, durationSec]) => {
  const id = `${ARTIST_ID}-${slug}`
  return {
    id,
    title,
    artistId: ARTIST_ID,
    cover: cover(`background/${id}.jpg`),
    plays: 0,
    durationSec,
    audio: audio(id),
  }
})

export const PLAYLIST_ID = "background-play"
