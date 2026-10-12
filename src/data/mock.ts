import { colors } from "@/theme"
import type { Category, Comment, FeedPost, Playlist, Suggestion } from "@/types"
import { tracks } from "./catalog"
import { images } from "./images"

export * from "./catalog"

export const initialPlaylists: Playlist[] = [
  {
    id: "top50",
    name: "Top 50 – Canada",
    owner: "Music Stream",
    trackIds: tracks.slice(0, 6).map((track) => track.id),
    cover: images.playlists.top50,
    description: "Daily chart-toppers update, featuring the tracks everyone is playing now.",
    likes: 1234,
  },
  {
    id: "top50-global",
    name: "Top 50 – Global",
    owner: "Music Stream",
    trackIds: ["blinding", "flower", "dynamite", "shape", "me"],
    cover: images.playlists.global,
    description: "The most-played tracks from listeners around the world.",
    likes: 8420,
  },
  {
    id: "top50-trending",
    name: "Top 50 – Trending",
    owner: "Music Stream",
    trackIds: ["astronaut", "levitating", "me", "flower"],
    cover: images.playlists.trending,
    description: "Fast-rising tracks and new favorites updated every day.",
    likes: 3805,
  },
  {
    id: "favorites",
    name: "My favorites",
    owner: "Ashley Scott",
    trackIds: ["flower", "levitating"],
    cover: images.playlists.favorites,
    description: "Ashley Scott's favorite tracks.",
    likes: 24,
  },
]

/** Editorial chart playlists shown on Home. */
export const charts: Playlist[] = initialPlaylists.filter((p) => p.owner === "Music Stream")

export const categories: Category[] = [
  {
    id: "pop",
    name: "Pop",
    gradient: colors.categoryGradients.pop,
    image: images.playlists.trending,
  },
  {
    id: "electronic",
    name: "Electronic",
    gradient: colors.categoryGradients.electronic,
    image: images.playlists.global,
  },
  {
    id: "indie",
    name: "Indie",
    gradient: colors.categoryGradients.indie,
    image: images.categories.indie,
  },
  {
    id: "chill",
    name: "Chill",
    gradient: colors.categoryGradients.chill,
    image: images.artists.brian,
  },
]

export const feedPosts: FeedPost[] = [
  {
    id: "post-1",
    user: "Jessica Gonzalez",
    artistId: "jessica",
    avatar: images.artists.jessica,
    age: "3d",
    trackId: "flower",
    artwork: images.feed.flower,
    likes: 20,
    comments: 3,
  },
  {
    id: "post-2",
    user: "William King",
    artistId: "william",
    avatar: images.artists.william,
    age: "5d",
    trackId: "me",
    artwork: images.feed.me,
    likes: 45,
    comments: 9,
  },
]

export const comments: Comment[] = [
  {
    id: "c1",
    name: "Sally Rooney",
    avatar: images.avatars.sally,
    text: "This has been on repeat all day.",
    time: "17h",
    likes: 1,
  },
  {
    id: "c2",
    name: "Jason Smith",
    avatar: images.avatars.jason,
    text: "The production is incredible.",
    time: "48m",
    likes: 1,
  },
  {
    id: "c3",
    name: "Michael Key",
    avatar: images.avatars.michael,
    text: "That chorus gets better every listen.",
    time: "40m",
    likes: 2,
    parentId: "c2",
  },
]

export const suggestions: Suggestion[] = [
  {
    id: "reflection",
    title: "Reflection",
    subtitle: "Jessica Gonzalez",
    image: images.playlists.trending,
    trackId: "flower",
  },
  {
    id: "in-the-stars",
    title: "In The Stars",
    subtitle: "Anthony Taylor",
    image: images.playlists.global,
    trackId: "levitating",
  },
]
