import {
  createArtist,
  createHitsAlbums,
  createTrack,
  type SeedArtist,
  type SeedTrack,
} from "./shared.js"

const artist = (id: string, name: string, baseFollowers: number, bio: string) =>
  createArtist("JAPAN", id, name, baseFollowers, bio)

const track = (artistId: string, slug: string, title: string, plays: number, durationSec: number) =>
  createTrack("JAPAN", artistId, slug, title, plays, durationSec)

export const ARTISTS: SeedArtist[] = [
  artist(
    "yoasobi",
    "YOASOBI",
    7_000_000,
    "Japanese duo of composer Ayase and vocalist ikura, formed in 2019.",
  ),
  artist(
    "kenshi-yonezu",
    "Kenshi Yonezu",
    5_000_000,
    "Japanese singer-songwriter, producer and illustrator.",
  ),
  artist(
    "higedan",
    "Official HIGE DANdism",
    3_000_000,
    "Japanese pop band fronted by vocalist and pianist Satoshi Fujihara.",
  ),
  artist("ado", "Ado", 4_500_000, "Japanese singer who rose to fame with “Usseewa” in 2020."),
  artist(
    "fujii-kaze",
    "Fujii Kaze",
    5_000_000,
    "Japanese singer-songwriter and pianist from Okayama Prefecture.",
  ),
  artist("king-gnu", "King Gnu", 3_000_000, "Japanese rock band fronted by Daiki Tsuneta."),
  artist(
    "creepy-nuts",
    "Creepy Nuts",
    2_500_000,
    "Japanese hip-hop duo of rapper R-指定 and DJ Matsunaga.",
  ),
  artist("aimer", "Aimer", 3_500_000, "Japanese singer known for the anime theme “Zankyosanka”."),
]

// approximate: update to real file length
export const TRACKS: SeedTrack[] = [
  track("yoasobi", "yoru-ni-kakeru", "夜に駆ける (Yoru ni Kakeru)", 350_000_000, 188),
  track("yoasobi", "idol", "アイドル (Idol)", 450_000_000, 213),
  track("kenshi-yonezu", "lemon", "Lemon", 500_000_000, 255),
  track("kenshi-yonezu", "kick-back", "KICK BACK", 300_000_000, 193),
  track("higedan", "pretender", "Pretender", 350_000_000, 326),
  track("higedan", "subtitle", "Subtitle", 300_000_000, 289),
  track("ado", "usseewa", "うっせぇわ (Usseewa)", 280_000_000, 203),
  track("ado", "new-genesis", "新時代 (New Genesis)", 250_000_000, 204),
  track("fujii-kaze", "shinunoga-e-wa", "死ぬのがいいわ (Shinunoga E-Wa)", 250_000_000, 185),
  track("king-gnu", "specialz", "SPECIALZ", 200_000_000, 224),
  track("creepy-nuts", "bling-bang-bang-born", "Bling-Bang-Bang-Born", 400_000_000, 142),
  track("aimer", "zankyosanka", "残響散歌 (Zankyosanka)", 180_000_000, 261),
]

export const ALBUMS = createHitsAlbums(ARTISTS, TRACKS)
