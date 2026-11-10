/** Shapes of the API answers the admin web uses (see the DTOs and services of the backend). */

export type Role = "USER" | "ADMIN"
export const REGIONS = ["VIETNAM", "KOREA", "JAPAN", "CHINA", "GLOBAL"] as const
export type Region = (typeof REGIONS)[number]

export interface Page<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface TrackView {
  id: string
  title: string
  artist: string
  artistId: string
  /** The cover (the create/update DTO calls it `coverUrl`). */
  cover: string
  audioUrl: string | null
  plays: number
  /** Seconds (the DTO calls it `durationSec`). */
  duration: number
  youtubeVideoId: string | null
  genres: string[]
  mood: string[]
  tags: string[]
  description: string
  language: string | null
  likesCount: number
  liked: boolean
}

export interface ArtistView {
  id: string
  name: string
  bio: string
  /** The picture (the DTO calls it `imageUrl`). */
  image: string
  region: Region
  genres: string[]
  followers: number
  followed: boolean
}

export interface AlbumView {
  id: string
  title: string
  artist: string
  artistId: string
  cover: string
  trackIds: string[]
  likesCount: number
  liked: boolean
}

export interface AlbumDetail extends AlbumView {
  tracks: TrackView[]
}

export interface FeedPostView {
  id: string
  artist: { id: string; name: string; image: string } | null
  track: TrackView | null
  artwork: string
  caption: string
  createdAt: string
  likesCount: number
  commentsCount: number
  liked: boolean
}

export interface AdminUser {
  id: string
  email: string
  name: string
  avatarUrl: string | null
  role: Role
  isPremium: boolean
  isBanned: boolean
  createdAt: string
}

export interface DailyCount {
  day: string
  count: number
}

export interface AdminStats {
  totals: {
    tracks: number
    artists: number
    albums: number
    users: number
    plays: number
    playsLast7Days: number
  }
  topTracks: { id: string; title: string; artist: string; coverUrl: string; plays: number }[]
  playsByDay: DailyCount[]
  newUsersByDay: DailyCount[]
}

export interface TranslationUsage {
  configured: boolean
  used: number | null
  limit: number | null
  percent: number | null
  warning: boolean
}

export interface LyricsView {
  trackId: string
  language: string
  lines: string[]
  timingsMs: number[] | null
  source: string
  updatedAt: string
}

export interface LyricsTranslation {
  trackId: string
  sourceLanguage: string
  targetLanguage: string
  lines: string[]
  provider: string
  cached: boolean
  translatedAt: string | null
}

export interface LyricsStatus {
  hasLyrics: boolean
  hasTimings: boolean
}

export interface AuthUser {
  id: string
  email: string
  name: string
  avatarUrl: string | null
  role: Role
  isPremium: boolean
}

export interface LoginResult {
  accessToken: string
  refreshToken: string
  user: AuthUser
}
