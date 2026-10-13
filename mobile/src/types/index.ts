import type { ImageSourcePropType } from "react-native"

export type ImageSource = ImageSourcePropType

export type Track = {
  id: string
  title: string
  artist: string
  artistId: string
  cover: ImageSource
  plays: number
  /** Duration in seconds. */
  duration: number
}

export type Artist = {
  id: string
  name: string
  followers: number
  image: ImageSource
  bio: string
  trackIds: string[]
  albumIds: string[]
}

export type Album = {
  id: string
  title: string
  artist: string
  artistId: string
  cover: ImageSource
  trackIds: string[]
}

export type Playlist = {
  id: string
  name: string
  owner: string
  trackIds: string[]
  cover: ImageSource
  description: string
  likes: number
}

export type FeedPost = {
  id: string
  user: string
  artistId: string
  avatar: ImageSource
  age: string
  trackId: string
  artwork: ImageSource
  likes: number
  comments: number
}

export type Comment = {
  id: string
  name: string
  avatar: ImageSource
  text: string
  time: string
  likes: number
  parentId?: string
}

export type Category = {
  id: string
  name: string
  gradient: readonly [string, string]
  image: ImageSource
}

export type Suggestion = {
  id: string
  title: string
  subtitle: string
  image: ImageSource
  trackId: string
}

export type RepeatMode = "off" | "all" | "one"

export type ChartItem = {
  /** Id of the playlist this chart opens. */
  id: string
  title: string
  country: string
  description: string
  gradient: readonly [string, string]
}
