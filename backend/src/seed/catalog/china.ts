import {
  createArtist,
  createHitsAlbums,
  createTrack,
  type SeedArtist,
  type SeedTrack,
} from "./shared.js"

// Region CHINA covers mainland China, Taiwan and Hong Kong; the app labels it "C-Pop".
const artist = (id: string, name: string, baseFollowers: number, bio: string) =>
  createArtist("CHINA", id, name, baseFollowers, bio)

const track = (artistId: string, slug: string, title: string, plays: number, durationSec: number) =>
  createTrack("CHINA", artistId, slug, title, plays, durationSec)

export const ARTISTS: SeedArtist[] = [
  artist(
    "jay-chou",
    "Jay Chou",
    9_000_000,
    "Taiwanese singer-songwriter, producer and actor who debuted in 2000.",
  ),
  artist("gem", "G.E.M.", 4_000_000, "Hong Kong singer-songwriter who debuted in 2008."),
  artist(
    "jj-lin",
    "JJ Lin",
    3_500_000,
    "Singaporean singer-songwriter and producer who debuted in 2003.",
  ),
  artist("mayday", "Mayday", 3_000_000, "Taiwanese rock band formed in 1997."),
  artist(
    "eason-chan",
    "Eason Chan",
    3_500_000,
    "Hong Kong singer and actor whose recording career began in 1995.",
  ),
]

// approximate: update to real file length
export const TRACKS: SeedTrack[] = [
  track("jay-chou", "love-confession", "告白气球 (Love Confession)", 280_000_000, 215),
  track("jay-chou", "sunny-day", "晴天 (Sunny Day)", 250_000_000, 269),
  track("jay-chou", "rice-field", "稻香 (Rice Field)", 220_000_000, 223),
  track("gem", "light-years-away", "光年之外 (Light Years Away)", 180_000_000, 235),
  track("gem", "bubble", "泡沫 (Bubble)", 160_000_000, 258),
  track("jj-lin", "jiang-nan", "江南 (Jiang Nan)", 200_000_000, 268),
  track("mayday", "stubborn", "倔强 (Stubborn)", 180_000_000, 250),
  track(
    "mayday",
    "suddenly-miss-you-so-bad",
    "突然好想你 (Suddenly Miss You So Bad)",
    190_000_000,
    266,
  ),
  track("eason-chan", "lonely-warrior", "孤勇者 (Lonely Warrior)", 260_000_000, 256),
]

export const ALBUMS = createHitsAlbums(ARTISTS, TRACKS)
