/**
 * Seed content, ported from the mobile app mock data (mobile/src/data).
 * Media is referenced as { folder, file } and turned into `${R2_PUBLIC_URL}/folder/file` by the seeder.
 */
export interface MediaRef {
  folder: "audio" | "covers" | "artists" | "banners"
  file: string
}

const cover = (file: string): MediaRef => ({ folder: "covers", file })
const artistImage = (file: string): MediaRef => ({ folder: "artists", file })
const audio = (id: string): MediaRef => ({ folder: "audio", file: `${id}.mp3` })

export const ARTISTS = [
  {
    id: "ryan",
    name: "Ryan Young",
    baseFollowers: 65_100,
    image: artistImage("ryan-young.png"),
    bio: "Ryan Young turns luminous synths, intimate vocals and restless rhythms into songs that feel both personal and cinematic.",
  },
  {
    id: "jessica",
    name: "Jessica Gonzalez",
    baseFollowers: 84_200,
    image: artistImage("jessica-gonzalez.png"),
    bio: "Jessica Gonzalez blends bold pop hooks with vivid visual storytelling and intimate songwriting.",
  },
  {
    id: "jennifer",
    name: "Jennifer Wilson",
    baseFollowers: 32_800,
    image: artistImage("jennifer-wilson.png"),
    bio: "Jennifer Wilson creates expansive pop songs with warm vocals and cinematic production.",
  },
  {
    id: "elizabeth",
    name: "Elizabeth Hall",
    baseFollowers: 28_400,
    image: artistImage("elizabeth-hall.png"),
    bio: "Elizabeth Hall is known for atmospheric electronic sets and intricate live performances.",
  },
  {
    id: "anthony",
    name: "Anthony Taylor",
    baseFollowers: 19_700,
    image: artistImage("anthony-taylor.png"),
    bio: "Anthony Taylor pairs modern pop production with soulful melodies.",
  },
  {
    id: "brian",
    name: "Brian Bailey",
    baseFollowers: 41_300,
    image: artistImage("brian-bailey.png"),
    bio: "Brian Bailey makes nocturnal pop with a pulse.",
  },
  {
    id: "pedro",
    name: "Pedro Moreno",
    baseFollowers: 37_600,
    image: artistImage("pedro-moreno.png"),
    bio: "Pedro Moreno brings sharp lyricism to ocean-sized production.",
  },
  {
    id: "elena",
    name: "Elena Jimenez",
    baseFollowers: 22_100,
    image: artistImage("jennifer-wilson.png"),
    bio: "Elena Jimenez writes bright, kinetic songs made for movement.",
  },
  {
    id: "william",
    name: "William King",
    baseFollowers: 54_900,
    image: artistImage("william-king.png"),
    bio: "William King makes expressive alternative pop with a visual edge.",
  },
] as const

export const TRACKS = [
  {
    id: "flower",
    title: "FLOWER",
    artistId: "jessica",
    cover: cover("track-flower.png"),
    plays: 2_100_000,
    durationSec: 216,
  },
  {
    id: "shape",
    title: "Shape of You",
    artistId: "anthony",
    cover: cover("track-shape-of-you.png"),
    plays: 68_000_000,
    durationSec: 215,
  },
  {
    id: "blinding",
    title: "Blinding Lights",
    artistId: "brian",
    cover: cover("track-blinding-lights.png"),
    plays: 93_000_000,
    durationSec: 279,
  },
  {
    id: "levitating",
    title: "Levitating",
    artistId: "anthony",
    cover: cover("track-levitating.png"),
    plays: 9_000_000,
    durationSec: 228,
  },
  {
    id: "astronaut",
    title: "Astronaut in the Ocean",
    artistId: "pedro",
    cover: cover("track-astronaut.png"),
    plays: 23_000_000,
    durationSec: 216,
  },
  {
    id: "dynamite",
    title: "Dynamite",
    artistId: "elena",
    cover: cover("track-dynamite.png"),
    plays: 10_000_000,
    durationSec: 202,
  },
  {
    id: "me",
    title: "Me",
    artistId: "william",
    cover: cover("track-me.png"),
    plays: 81_000_000,
    durationSec: 315,
  },
].map((track) => ({ ...track, audio: audio(track.id) }))

export const ALBUMS = [
  {
    id: "me-album",
    title: "ME",
    artistId: "jessica",
    cover: cover("album-me.png"),
    trackIds: ["flower", "me"],
  },
  {
    id: "magna",
    title: "Magna nost",
    artistId: "brian",
    cover: cover("album-magna-nost.png"),
    trackIds: ["blinding", "levitating", "shape"],
  },
  {
    id: "proident",
    title: "Proident",
    artistId: "pedro",
    cover: cover("album-proident.png"),
    trackIds: ["astronaut", "dynamite"],
  },
] as const

export const PLAYLISTS = [
  {
    id: "top50",
    name: "Top 50 – Canada",
    official: true,
    cover: cover("playlist-top50-canada.png"),
    description: "Daily chart-toppers update, featuring the tracks everyone is playing now.",
    trackIds: ["flower", "shape", "blinding", "levitating", "astronaut", "dynamite"],
  },
  {
    id: "top50-global",
    name: "Top 50 – Global",
    official: true,
    cover: cover("playlist-top50-global.png"),
    description: "The most-played tracks from listeners around the world.",
    trackIds: ["blinding", "flower", "dynamite", "shape", "me"],
  },
  {
    id: "top50-trending",
    name: "Top 50 – Trending",
    official: true,
    cover: cover("playlist-top50-trending.png"),
    description: "Fast-rising tracks and new favorites updated every day.",
    trackIds: ["astronaut", "levitating", "me", "flower"],
  },
  {
    id: "favorites",
    name: "My favorites",
    official: false,
    cover: cover("playlist-favorites.png"),
    description: "Ashley Scott's favorite tracks.",
    trackIds: ["flower", "levitating"],
  },
] as const

export const FEED_POSTS = [
  {
    id: "post-1",
    artistId: "jessica",
    trackId: "flower",
    artwork: { folder: "banners", file: "post-flower.png" } as MediaRef,
    daysAgo: 3,
  },
  {
    id: "post-2",
    artistId: "william",
    trackId: "me",
    artwork: { folder: "banners", file: "post-me.png" } as MediaRef,
    daysAgo: 5,
  },
] as const

/** Fictional commenters (they cannot log in: random password). */
export const COMMENTERS = [
  {
    id: "user-sally",
    name: "Sally Rooney",
    email: "sally.rooney@seed.invalid",
    avatar: artistImage("avatar-sally-rooney.png"),
  },
  {
    id: "user-jason",
    name: "Jason Smith",
    email: "jason.smith@seed.invalid",
    avatar: artistImage("avatar-jason-smith.png"),
  },
  {
    id: "user-michael",
    name: "Michael Key",
    email: "michael.key@seed.invalid",
    avatar: artistImage("avatar-michael-key.png"),
  },
] as const

export const COMMENTS = [
  {
    id: "c1",
    userId: "user-sally",
    postId: "post-1",
    text: "This has been on repeat all day.",
    minutesAgo: 17 * 60,
    likedBy: ["user-jason"],
  },
  {
    id: "c2",
    userId: "user-jason",
    postId: "post-1",
    text: "The production is incredible.",
    minutesAgo: 48,
    likedBy: ["user-sally"],
  },
  {
    id: "c3",
    userId: "user-michael",
    postId: "post-1",
    text: "That chorus gets better every listen.",
    minutesAgo: 40,
    parentId: "c2",
    likedBy: ["user-sally", "user-jason"],
  },
] as const

/** Starting library of the demo admin account ("Ashley Scott" in the mobile mock). */
export const ADMIN_PROFILE = {
  name: "Ashley Scott",
  avatar: { folder: "artists", file: "user-ashley-scott.png" } as MediaRef,
  likedTrackIds: ["flower", "levitating"],
  likedPlaylistIds: ["top50"],
  likedAlbumIds: ["me-album"],
  followedArtistIds: ["jennifer"],
}
