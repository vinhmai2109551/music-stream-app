import {
  createArtist,
  createHitsAlbums,
  createTrack,
  type SeedArtist,
  type SeedTrack,
} from "./shared.js"

const artist = (id: string, name: string, baseFollowers: number, bio: string) =>
  createArtist("KOREA", id, name, baseFollowers, bio)

const track = (artistId: string, slug: string, title: string, plays: number, durationSec: number) =>
  createTrack("KOREA", artistId, slug, title, plays, durationSec)

export const ARTISTS: SeedArtist[] = [
  artist(
    "bts",
    "BTS",
    75_000_000,
    "South Korean boy band that debuted in 2013 under Big Hit Entertainment.",
  ),
  artist(
    "jung-kook",
    "Jung Kook",
    14_000_000,
    "South Korean singer and member of BTS who released his solo single “Seven” in 2023.",
  ),
  artist(
    "jimin",
    "Jimin",
    9_000_000,
    "South Korean singer and member of BTS who released his solo single “Like Crazy” in 2023.",
  ),
  artist(
    "blackpink",
    "BLACKPINK",
    40_000_000,
    "South Korean girl group formed by YG Entertainment, made up of Jisoo, Jennie, Rosé and Lisa.",
  ),
  artist(
    "rose",
    "ROSÉ",
    12_000_000,
    "New Zealand-born singer and member of BLACKPINK, known for the 2024 single “APT.” with Bruno Mars.",
  ),
  artist(
    "jennie",
    "JENNIE",
    10_000_000,
    "South Korean rapper and singer, member of BLACKPINK, known for her solo songs “SOLO” and “like JENNIE”.",
  ),
  artist(
    "lisa",
    "LISA",
    11_000_000,
    "Thai rapper and singer, member of BLACKPINK, known for her solo songs “MONEY” and “ROCKSTAR”.",
  ),
  artist(
    "newjeans",
    "NewJeans",
    11_000_000,
    "South Korean girl group that debuted in 2022 under ADOR.",
  ),
  artist(
    "aespa",
    "aespa",
    8_000_000,
    "South Korean girl group formed by SM Entertainment that debuted in 2020.",
  ),
  artist(
    "ive",
    "IVE",
    6_000_000,
    "South Korean girl group that debuted in 2021 under Starship Entertainment.",
  ),
  artist(
    "le-sserafim",
    "LE SSERAFIM",
    6_000_000,
    "South Korean girl group that debuted in 2022 under Source Music.",
  ),
  artist(
    "twice",
    "TWICE",
    14_000_000,
    "South Korean girl group formed by JYP Entertainment that debuted in 2015.",
  ),
  artist(
    "stray-kids",
    "Stray Kids",
    18_000_000,
    "South Korean boy band formed by JYP Entertainment that debuted in 2018.",
  ),
  artist(
    "seventeen",
    "SEVENTEEN",
    12_000_000,
    "South Korean boy band formed by Pledis Entertainment that debuted in 2015.",
  ),
  artist("iu", "IU", 8_000_000, "South Korean singer-songwriter and actress who debuted in 2008."),
  artist(
    "bigbang",
    "BIGBANG",
    10_000_000,
    "South Korean boy band formed by YG Entertainment that debuted in 2006.",
  ),
  artist(
    "g-dragon",
    "G-DRAGON",
    11_000_000,
    "South Korean rapper, singer-songwriter and member of BIGBANG.",
  ),
]

// approximate: update to real file length
export const TRACKS: SeedTrack[] = [
  track("bts", "dynamite", "Dynamite", 950_000_000, 199),
  track("bts", "butter", "Butter", 900_000_000, 164),
  track("bts", "boy-with-luv", "Boy With Luv", 700_000_000, 230),
  track("bts", "spring-day", "Spring Day", 400_000_000, 274),
  track("bts", "dna", "DNA", 500_000_000, 223),
  track("bts", "permission-to-dance", "Permission to Dance", 250_000_000, 187),
  track("jung-kook", "seven", "Seven", 800_000_000, 184),
  track("jung-kook", "standing-next-to-you", "Standing Next to You", 350_000_000, 227),
  track("jimin", "like-crazy", "Like Crazy", 300_000_000, 213),
  track("blackpink", "how-you-like-that", "How You Like That", 750_000_000, 181),
  track("blackpink", "ddu-du-ddu-du", "DDU-DU DDU-DU", 800_000_000, 209),
  track("blackpink", "pink-venom", "Pink Venom", 600_000_000, 186),
  track("blackpink", "shut-down", "Shut Down", 400_000_000, 175),
  track("rose", "apt", "APT.", 700_000_000, 169),
  track("jennie", "solo", "SOLO", 300_000_000, 170),
  track("jennie", "like-jennie", "like JENNIE", 120_000_000, 158),
  track("lisa", "money", "MONEY", 600_000_000, 171),
  track("lisa", "rockstar", "ROCKSTAR", 250_000_000, 163),
  track("newjeans", "hype-boy", "Hype Boy", 500_000_000, 179),
  track("newjeans", "ditto", "Ditto", 550_000_000, 187),
  track("newjeans", "omg", "OMG", 450_000_000, 212),
  track("newjeans", "super-shy", "Super Shy", 400_000_000, 155),
  track("aespa", "next-level", "Next Level", 300_000_000, 220),
  track("aespa", "supernova", "Supernova", 280_000_000, 179),
  track("aespa", "whiplash", "Whiplash", 200_000_000, 198),
  track("ive", "love-dive", "LOVE DIVE", 400_000_000, 177),
  track("ive", "after-like", "After LIKE", 300_000_000, 177),
  track("ive", "i-am", "I AM", 250_000_000, 187),
  track("le-sserafim", "antifragile", "ANTIFRAGILE", 250_000_000, 187),
  track("le-sserafim", "easy", "EASY", 180_000_000, 175),
  track("twice", "fancy", "FANCY", 350_000_000, 212),
  track("twice", "what-is-love", "What is Love?", 300_000_000, 208),
  track("stray-kids", "gods-menu", "God's Menu", 200_000_000, 174),
  track("stray-kids", "maniac", "MANIAC", 250_000_000, 184),
  track("stray-kids", "s-class", "S-Class", 150_000_000, 189),
  track("seventeen", "hot", "HOT", 120_000_000, 187),
  track("seventeen", "super", "Super", 140_000_000, 187),
  track("iu", "blueming", "Blueming", 180_000_000, 217),
  track("iu", "celebrity", "Celebrity", 250_000_000, 195),
  track("iu", "love-wins-all", "Love wins all", 110_000_000, 250),
  track("bigbang", "haru-haru", "Haru Haru", 150_000_000, 236),
  track("bigbang", "bang-bang-bang", "BANG BANG BANG", 350_000_000, 221),
  track("g-dragon", "power", "POWER", 90_000_000, 188),
]

export const ALBUMS = createHitsAlbums(ARTISTS, TRACKS)
