import type { Album, Artist, Track } from "@/types"
import { images } from "./images"

export const tracks: Track[] = [
  {
    id: "flower",
    title: "FLOWER",
    artist: "Jessica Gonzalez",
    artistId: "jessica",
    cover: images.tracks.flower,
    plays: 2_100_000,
    duration: 216,
  },
  {
    id: "shape",
    title: "Shape of You",
    artist: "Anthony Taylor",
    artistId: "anthony",
    cover: images.tracks.shape,
    plays: 68_000_000,
    duration: 215,
  },
  {
    id: "blinding",
    title: "Blinding Lights",
    artist: "Brian Bailey",
    artistId: "brian",
    cover: images.tracks.blinding,
    plays: 93_000_000,
    duration: 279,
  },
  {
    id: "levitating",
    title: "Levitating",
    artist: "Anthony Taylor",
    artistId: "anthony",
    cover: images.tracks.levitating,
    plays: 9_000_000,
    duration: 228,
  },
  {
    id: "astronaut",
    title: "Astronaut in the Ocean",
    artist: "Pedro Moreno",
    artistId: "pedro",
    cover: images.tracks.astronaut,
    plays: 23_000_000,
    duration: 216,
  },
  {
    id: "dynamite",
    title: "Dynamite",
    artist: "Elena Jimenez",
    artistId: "elena",
    cover: images.tracks.dynamite,
    plays: 10_000_000,
    duration: 202,
  },
  {
    id: "me",
    title: "Me",
    artist: "William King",
    artistId: "william",
    cover: images.tracks.me,
    plays: 81_000_000,
    duration: 315,
  },
]

export const artists: Artist[] = [
  {
    id: "ryan",
    name: "Ryan Young",
    followers: 65_100,
    image: images.artists.ryan,
    bio: "Ryan Young turns luminous synths, intimate vocals and restless rhythms into songs that feel both personal and cinematic.",
    trackIds: ["shape", "blinding", "levitating", "astronaut", "dynamite"],
    albumIds: ["magna", "proident"],
  },
  {
    id: "jessica",
    name: "Jessica Gonzalez",
    followers: 84_200,
    image: images.artists.jessica,
    bio: "Jessica Gonzalez blends bold pop hooks with vivid visual storytelling and intimate songwriting.",
    trackIds: ["flower"],
    albumIds: ["me-album"],
  },
  {
    id: "jennifer",
    name: "Jennifer Wilson",
    followers: 32_800,
    image: images.artists.jennifer,
    bio: "Jennifer Wilson creates expansive pop songs with warm vocals and cinematic production.",
    trackIds: ["me"],
    albumIds: [],
  },
  {
    id: "elizabeth",
    name: "Elizabeth Hall",
    followers: 28_400,
    image: images.artists.elizabeth,
    bio: "Elizabeth Hall is known for atmospheric electronic sets and intricate live performances.",
    trackIds: ["levitating"],
    albumIds: [],
  },
  {
    id: "anthony",
    name: "Anthony Taylor",
    followers: 19_700,
    image: images.artists.anthony,
    bio: "Anthony Taylor pairs modern pop production with soulful melodies.",
    trackIds: ["shape", "levitating"],
    albumIds: [],
  },
  {
    id: "brian",
    name: "Brian Bailey",
    followers: 41_300,
    image: images.artists.brian,
    bio: "Brian Bailey makes nocturnal pop with a pulse.",
    trackIds: ["blinding"],
    albumIds: ["magna"],
  },
  {
    id: "pedro",
    name: "Pedro Moreno",
    followers: 37_600,
    image: images.artists.pedro,
    bio: "Pedro Moreno brings sharp lyricism to ocean-sized production.",
    trackIds: ["astronaut"],
    albumIds: ["proident"],
  },
  {
    id: "elena",
    name: "Elena Jimenez",
    followers: 22_100,
    image: images.artists.jennifer,
    bio: "Elena Jimenez writes bright, kinetic songs made for movement.",
    trackIds: ["dynamite"],
    albumIds: [],
  },
  {
    id: "william",
    name: "William King",
    followers: 54_900,
    image: images.artists.william,
    bio: "William King makes expressive alternative pop with a visual edge.",
    trackIds: ["me"],
    albumIds: [],
  },
]

export const albums: Album[] = [
  {
    id: "me-album",
    title: "ME",
    artist: "Jessica Gonzalez",
    artistId: "jessica",
    cover: images.albums.me,
    trackIds: ["flower", "me"],
  },
  {
    id: "magna",
    title: "Magna nost",
    artist: "Brian Thomas",
    artistId: "brian",
    cover: images.albums.magna,
    trackIds: ["blinding", "levitating", "shape"],
  },
  {
    id: "proident",
    title: "Proident",
    artist: "Christopher",
    artistId: "pedro",
    cover: images.albums.proident,
    trackIds: ["astronaut", "dynamite"],
  },
]

const trackById = new Map(tracks.map((track) => [track.id, track]))
const artistById = new Map(artists.map((artist) => [artist.id, artist]))
const albumById = new Map(albums.map((album) => [album.id, album]))

export const getTrack = (id: string): Track | undefined => trackById.get(id)
export const getArtist = (id: string): Artist | undefined => artistById.get(id)
export const getAlbum = (id: string): Album | undefined => albumById.get(id)

/** Resolves ids to tracks, skipping unknown ids. */
export function getTracks(ids: string[]): Track[] {
  return ids.flatMap((id) => {
    const track = trackById.get(id)
    return track ? [track] : []
  })
}
